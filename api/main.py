"""
FastAPI backend for LLM-powered trip planning with Google Places.

Features:
- POST /plan: Natural language trip planning using OpenAI + Google Places
- GET /search: Direct Google Places text search
- Rate limiting for both APIs
- Caching for Google Places results

Run with:
    uvicorn api.main:app --reload
"""

import os
import time
import json
import hashlib
from collections import deque
from contextlib import asynccontextmanager

import openai
import httpx
import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")  # WeatherAPI.com key
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Rate limits
OPENAI_RATE_LIMIT_PER_MINUTE = int(os.getenv("OPENAI_RATE_LIMIT_PER_MINUTE", "60"))
OPENAI_RATE_LIMIT_PER_DAY = int(os.getenv("OPENAI_RATE_LIMIT_PER_DAY", "1000"))
GOOGLE_RATE_LIMIT_PER_MINUTE = int(os.getenv("GOOGLE_RATE_LIMIT_PER_MINUTE", "60"))
GOOGLE_RATE_LIMIT_PER_DAY = int(os.getenv("GOOGLE_RATE_LIMIT_PER_DAY", "1000"))

# Cache TTL
CACHE_TTL_SECONDS = 30 * 60  # 30 minutes


# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()

class FavoritePlace(Base):
    """Database model for saved favorite places."""
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_code = Column(String(10), index=True, nullable=False)
    place_id = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    lat = Column(Float)
    lng = Column(Float)
    rating = Column(Float)
    category = Column(String(100))
    photo_url = Column(String(1000))  # Google Places URLs can be long
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedTrip(Base):
    """Database model for saved trips."""
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_code = Column(String(10), index=True, nullable=False)
    trip_id = Column(String(20), nullable=False)  # Client-generated ID
    query = Column(String(500))
    summary = Column(String(500))
    trip_data = Column(String(50000))  # JSON string of full trip
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    """Database model for user accounts."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    sync_code = Column(String(10), unique=True, nullable=False)  # Auto-generated sync code
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


# Database engine and session (initialized in lifespan if DATABASE_URL is set)
db_engine = None
SessionLocal = None


# =============================================================================
# RATE LIMITER
# =============================================================================

class RateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self, per_minute: int, per_day: int, name: str = ""):
        self.per_minute = per_minute
        self.per_day = per_day
        self.name = name
        self.minute_window: deque = deque()
        self.day_window: deque = deque()

    def _clean_windows(self):
        """Remove expired timestamps from windows."""
        now = time.time()
        minute_ago = now - 60
        day_ago = now - 86400

        while self.minute_window and self.minute_window[0] < minute_ago:
            self.minute_window.popleft()
        while self.day_window and self.day_window[0] < day_ago:
            self.day_window.popleft()

    def check(self) -> tuple[bool, str]:
        """Check if request is allowed. Returns (allowed, reason)."""
        self._clean_windows()

        if len(self.minute_window) >= self.per_minute:
            return False, f"{self.name} rate limit exceeded: {self.per_minute}/minute"
        if len(self.day_window) >= self.per_day:
            return False, f"{self.name} rate limit exceeded: {self.per_day}/day"

        return True, ""

    def record(self):
        """Record a request."""
        now = time.time()
        self.minute_window.append(now)
        self.day_window.append(now)

    def status(self) -> dict:
        """Get current rate limit status."""
        self._clean_windows()
        return {
            "minute_used": len(self.minute_window),
            "minute_limit": self.per_minute,
            "day_used": len(self.day_window),
            "day_limit": self.per_day,
        }


# =============================================================================
# CACHE
# =============================================================================

class SearchCache:
    """Simple TTL cache for Google Places results."""

    def __init__(self, ttl_seconds: int = CACHE_TTL_SECONDS):
        self.ttl = ttl_seconds
        self.cache: dict[str, tuple[float, list]] = {}

    def _make_key(self, query: str) -> str:
        return hashlib.md5(query.lower().strip().encode()).hexdigest()

    def get(self, query: str) -> list | None:
        key = self._make_key(query)
        if key in self.cache:
            timestamp, data = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            del self.cache[key]
        return None

    def set(self, query: str, data: list):
        key = self._make_key(query)
        self.cache[key] = (time.time(), data)

    def clear_expired(self):
        """Remove expired entries."""
        now = time.time()
        expired = [k for k, (ts, _) in self.cache.items() if now - ts >= self.ttl]
        for k in expired:
            del self.cache[k]


# =============================================================================
# GLOBAL STATE
# =============================================================================

openai_limiter = RateLimiter(OPENAI_RATE_LIMIT_PER_MINUTE, OPENAI_RATE_LIMIT_PER_DAY, "OpenAI")
google_limiter = RateLimiter(GOOGLE_RATE_LIMIT_PER_MINUTE, GOOGLE_RATE_LIMIT_PER_DAY, "Google")
places_cache = SearchCache()
openai_client: openai.OpenAI | None = None
http_client: httpx.AsyncClient | None = None


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class PlaceSummary(BaseModel):
    """Place info for results."""
    place_id: str
    name: str
    address: str
    lat: float
    lng: float
    rating: float | None = None
    rating_count: int = 0
    category: str = ""
    why: str | None = None
    photo_url: str | None = None
    price_level: int | None = None  # 1=cheap, 2=moderate, 3=expensive, 4=very expensive


class Activity(BaseModel):
    """A single activity in the itinerary."""
    activity_type: str  # "drive", "food", "attraction", "activity", "hotel"
    time_slot: str | None = None  # e.g., "9:00 AM", "12:30 PM", "Evening"
    description: str  # e.g., "Drive to Miami", "Visit the beach"
    place: PlaceSummary | None = None  # The actual place from Google


class DayPlan(BaseModel):
    """A detailed day plan with activities."""
    day: int
    date_label: str  # e.g., "Day 1 - Austin to San Antonio"
    activities: list[Activity]


class SearchResponse(BaseModel):
    """Response for /search endpoint."""
    query: str
    results: list[PlaceSummary]


class PlanRequest(BaseModel):
    """Request body for /plan endpoint."""
    query: str


class PlanResponse(BaseModel):
    """Response for /plan endpoint."""
    query: str
    summary: str  # Brief trip summary
    days: list[DayPlan]


# =============================================================================
# LLM INTEGRATION
# =============================================================================

PLAN_SYSTEM_PROMPT = """You are a smart road trip planner who creates natural, flexible itineraries that feel like real trips - not rigid schedules.

Respond with valid JSON only:
{
  "summary": "Brief 5-8 word trip title",
  "days": [
    {
      "day": 1,
      "date_label": "Exploring Austin",
      "activities": [
        {"activity_type": "activity", "time_slot": "Start", "description": "Begin your trip in downtown Austin", "search_query": null},
        {"activity_type": "attraction", "time_slot": "Morning", "description": "Walk the famous South Congress Avenue for murals and boutiques", "search_query": "South Congress Avenue Austin TX"},
        {"activity_type": "food", "time_slot": "Brunch", "description": "Brunch at a popular local spot", "search_query": "best brunch Austin TX"},
        {"activity_type": "attraction", "time_slot": "Afternoon", "description": "Cool off at Barton Springs Pool", "search_query": "Barton Springs Pool Austin TX"},
        {"activity_type": "food", "time_slot": "Dinner", "description": "Famous Texas BBQ for dinner", "search_query": "best BBQ restaurant Austin TX"},
        {"activity_type": "hotel", "time_slot": "Evening", "description": "Stay downtown", "search_query": "hotel downtown Austin TX"}
      ]
    },
    {
      "day": 2,
      "date_label": "Austin to San Antonio",
      "activities": [
        {"activity_type": "drive", "time_slot": "Start", "description": "Drive to San Antonio (1.5 hours on I-35)", "search_query": null},
        {"activity_type": "attraction", "time_slot": "Late Morning", "description": "Visit the Alamo", "search_query": "The Alamo San Antonio TX"},
        {"activity_type": "food", "time_slot": "Lunch", "description": "Tex-Mex on the River Walk", "search_query": "best Tex-Mex River Walk San Antonio TX"},
        {"activity_type": "activity", "time_slot": "Afternoon", "description": "Stroll the River Walk, explore shops and scenery", "search_query": "San Antonio River Walk"},
        {"activity_type": "food", "time_slot": "Dinner", "description": "Dinner with river views", "search_query": "riverside restaurant San Antonio TX"},
        {"activity_type": "hotel", "time_slot": "Evening", "description": "Hotel near River Walk", "search_query": "hotel River Walk San Antonio TX"}
      ]
    }
  ]
}

DAY TYPES - Mix these naturally:
1. **City Day**: Spend the whole day exploring one place (big cities deserve this)
2. **Travel Day**: Drive to next destination with 1-2 stops along the way
3. **Scenic Drive Day**: Long drive with roadside attractions, viewpoints, small towns
4. **Split Day**: Morning in one place, afternoon/evening in another

TIME SLOTS - Use natural labels:
- "Start" for the first activity of the day
- "Morning", "Late Morning"
- "Brunch" OR "Lunch" (pick one based on the vibe - brunch cities vs lunch spots)
- "Afternoon", "Late Afternoon"
- "Dinner", "Evening"
- For drives: include duration like "Drive south (2 hours)"

activity_type options: "drive", "food", "attraction", "activity", "hotel"
search_query: Include city and state. Use null for drives and "Start" activities.

GUIDELINES:
- NO breakfast - skip it. Use Brunch or Lunch instead.
- Big cities (NYC, LA, Chicago, Miami, Austin, etc.) = spend a full day there
- Small towns = quick stops, maybe 1-2 hours
- Beach destinations = afternoon for beach time, not packed with activities
- Be specific: "Walk the Brooklyn Bridge at sunset" not "explore Brooklyn"
- Include realistic drive times in the description
- search_query should be specific: "best tacos Mission District San Francisco" not just "restaurant"
- Mix famous spots with local hidden gems
- Last day should end at a logical departure point
- 3-5 activities per day is plenty. Don't over-schedule.
- IMPORTANT: Stay within the geographic region the user requested. If they say "Texas roadtrip", ALL destinations must be in Texas. If they say "California coast trip", stay in California. Only include other states if the user explicitly requests a multi-state trip (e.g., "Texas to Nashville", "Southwest road trip", "cross-country trip")."""


async def call_openai(query: str) -> dict:
    """Parse user query into detailed trip plan using OpenAI."""
    if openai_client is None:
        raise HTTPException(status_code=503, detail="OpenAI client not initialized")

    allowed, reason = openai_limiter.check()
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": PLAN_SYSTEM_PROMPT},
                {"role": "user", "content": f"Plan this trip: {query}"}
            ]
        )
        openai_limiter.record()

        response_text = response.choices[0].message.content
        return json.loads(response_text)

    except openai.APIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse LLM response")


# =============================================================================
# GOOGLE PLACES INTEGRATION
# =============================================================================

GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText"


async def search_google_places(query: str, max_results: int = 5) -> list[dict]:
    """Search Google Places Text Search API with caching."""
    # Check cache first
    cached = places_cache.get(query)
    if cached is not None:
        return cached[:max_results]

    # Check rate limit
    allowed, reason = google_limiter.check()
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.photos,places.priceLevel"
    }

    body = {
        "textQuery": query,
        "maxResultCount": max_results
    }

    try:
        response = await http_client.post(GOOGLE_PLACES_URL, headers=headers, json=body)
        google_limiter.record()

        if response.status_code != 200:
            error_detail = response.text
            raise HTTPException(
                status_code=502,
                detail=f"Google Places API error: {response.status_code} - {error_detail}"
            )

        data = response.json()
        places = data.get("places", [])

        # Transform to our format
        results = []
        for place in places:
            location = place.get("location", {})

            # Get photo URL if available
            photo_url = None
            photos = place.get("photos", [])
            if photos:
                photo_name = photos[0].get("name", "")
                if photo_name:
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=400&key={GOOGLE_PLACES_API_KEY}"

            # Parse price level (Google returns strings like "PRICE_LEVEL_MODERATE")
            price_level_str = place.get("priceLevel", "")
            price_level = None
            if "INEXPENSIVE" in price_level_str:
                price_level = 1
            elif "MODERATE" in price_level_str:
                price_level = 2
            elif "EXPENSIVE" in price_level_str:
                price_level = 3
            elif "VERY_EXPENSIVE" in price_level_str:
                price_level = 4

            results.append({
                "place_id": place.get("id", ""),
                "name": place.get("displayName", {}).get("text", ""),
                "address": place.get("formattedAddress", ""),
                "lat": location.get("latitude", 0),
                "lng": location.get("longitude", 0),
                "rating": place.get("rating"),
                "rating_count": place.get("userRatingCount", 0),
                "category": place.get("primaryType", ""),
                "photo_url": photo_url,
                "price_level": price_level,
            })

        # Cache results
        places_cache.set(query, results)
        return results

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to reach Google Places API: {str(e)}")


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize clients on startup, cleanup on shutdown."""
    global openai_client, http_client, db_engine, SessionLocal

    # Validate API keys
    if not OPENAI_API_KEY:
        print("WARNING: OPENAI_API_KEY not set. /plan endpoint will not work.")
    else:
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
        print("OpenAI client initialized")

    if not GOOGLE_PLACES_API_KEY:
        print("WARNING: GOOGLE_PLACES_API_KEY not set. Search endpoints will not work.")

    # Initialize database
    if DATABASE_URL:
        db_engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(bind=db_engine)
        Base.metadata.create_all(db_engine)
        print("Database connected")
    else:
        print("WARNING: DATABASE_URL not set. Favorites sync will not work.")

    http_client = httpx.AsyncClient(timeout=30.0)
    print("HTTP client initialized")
    print("Ready to serve requests!")

    yield

    # Cleanup
    if http_client:
        await http_client.aclose()
    if db_engine:
        db_engine.dispose()
    print("Shutting down...")


# =============================================================================
# CREATE APP
# =============================================================================

app = FastAPI(
    title="Road Trip Planner API",
    description="LLM-powered trip planning with Google Places",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/search", response_model=SearchResponse)
async def search(
    query: str = Query(..., min_length=1, description="Search query for places"),
    limit: int = Query(10, ge=1, le=20, description="Number of results"),
):
    """
    Direct Google Places text search.
    """
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=503, detail="Google Places API key not configured")

    results = await search_google_places(query, max_results=limit)

    return SearchResponse(
        query=query,
        results=[PlaceSummary(**r) for r in results],
    )


@app.post("/plan", response_model=PlanResponse)
async def create_plan(request: PlanRequest):
    """
    Create a detailed trip plan using natural language.

    Returns a day-by-day itinerary with:
    - Morning activities
    - Lunch recommendations
    - Afternoon activities
    - Dinner recommendations
    - Accommodation

    Example queries:
    - "5 day roadtrip through florida beaches and seafood"
    - "weekend trip austin for live music and tacos"
    - "3 days in san antonio historic sites and mexican food"
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=503, detail="Google Places API key not configured")

    # Step 1: Get detailed plan from OpenAI
    plan = await call_openai(request.query)

    # Step 2: For each activity with a search_query, find the actual place
    days: list[DayPlan] = []

    for day_data in plan.get("days", []):
        activities: list[Activity] = []

        for act in day_data.get("activities", []):
            search_query = act.get("search_query")
            place = None

            if search_query:
                try:
                    results = await search_google_places(search_query, max_results=1)
                    if results:
                        place = PlaceSummary(**results[0], why=act.get("description"))
                except HTTPException:
                    pass  # Skip if search fails

            activities.append(Activity(
                activity_type=act.get("activity_type", "activity"),
                time_slot=act.get("time_slot"),
                description=act.get("description", ""),
                place=place
            ))

        days.append(DayPlan(
            day=day_data.get("day", 1),
            date_label=day_data.get("date_label", f"Day {day_data.get('day', 1)}"),
            activities=activities
        ))

    return PlanResponse(
        query=request.query,
        summary=plan.get("summary", ""),
        days=days
    )


@app.get("/health")
def health_check():
    """Health check with rate limit status."""
    return {
        "status": "healthy",
        "openai_configured": OPENAI_API_KEY is not None,
        "google_configured": GOOGLE_PLACES_API_KEY is not None,
        "database_configured": DATABASE_URL is not None,
        "rate_limits": {
            "openai": openai_limiter.status(),
            "google": google_limiter.status(),
        },
        "cache_entries": len(places_cache.cache),
    }


# =============================================================================
# FAVORITES ENDPOINTS
# =============================================================================

class FavoritePlaceRequest(BaseModel):
    """Request model for adding a favorite place."""
    place_id: str
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    rating: float | None = None
    category: str | None = None
    photo_url: str | None = None


class FavoritePlaceResponse(BaseModel):
    """Response model for a favorite place."""
    id: int
    place_id: str
    name: str
    address: str | None
    lat: float | None
    lng: float | None
    rating: float | None
    category: str | None
    photo_url: str | None


def generate_sync_code() -> str:
    """Generate a random 6-character sync code."""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@app.post("/sync/create")
def create_sync_code():
    """Generate a new sync code for a user."""
    return {"sync_code": generate_sync_code()}


@app.get("/favorites/{sync_code}")
def get_favorites(sync_code: str):
    """Get all favorites for a sync code."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        favorites = session.query(FavoritePlace).filter(
            FavoritePlace.sync_code == sync_code.upper()
        ).all()

        return {
            "sync_code": sync_code.upper(),
            "favorites": [
                {
                    "id": f.id,
                    "place_id": f.place_id,
                    "name": f.name,
                    "address": f.address,
                    "lat": f.lat,
                    "lng": f.lng,
                    "rating": f.rating,
                    "category": f.category,
                    "photo_url": f.photo_url,
                }
                for f in favorites
            ]
        }
    finally:
        session.close()


@app.post("/favorites/{sync_code}")
def add_favorite(sync_code: str, place: FavoritePlaceRequest):
    """Add a place to favorites."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        # Check if already favorited
        existing = session.query(FavoritePlace).filter(
            FavoritePlace.sync_code == sync_code.upper(),
            FavoritePlace.place_id == place.place_id
        ).first()

        if existing:
            return {"message": "Already in favorites", "id": existing.id}

        # Truncate photo_url if too long (Google URLs can be 500+ chars)
        photo_url = place.photo_url[:500] if place.photo_url else None

        favorite = FavoritePlace(
            sync_code=sync_code.upper(),
            place_id=place.place_id,
            name=place.name,
            address=place.address,
            lat=place.lat,
            lng=place.lng,
            rating=place.rating,
            category=place.category,
            photo_url=photo_url,
        )
        session.add(favorite)
        session.commit()

        return {"message": "Added to favorites", "id": favorite.id}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        session.close()


@app.delete("/favorites/{sync_code}/{place_id}")
def remove_favorite(sync_code: str, place_id: str):
    """Remove a place from favorites."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        favorite = session.query(FavoritePlace).filter(
            FavoritePlace.sync_code == sync_code.upper(),
            FavoritePlace.place_id == place_id
        ).first()

        if not favorite:
            raise HTTPException(status_code=404, detail="Favorite not found")

        session.delete(favorite)
        session.commit()

        return {"message": "Removed from favorites"}
    finally:
        session.close()


# =============================================================================
# TRIPS ENDPOINTS
# =============================================================================

class SaveTripRequest(BaseModel):
    """Request model for saving a trip."""
    trip_id: str
    query: str
    summary: str
    days: list  # Full trip data


@app.get("/trips/{sync_code}")
def get_trips(sync_code: str):
    """Get all saved trips for a sync code."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        trips = session.query(SavedTrip).filter(
            SavedTrip.sync_code == sync_code.upper()
        ).order_by(SavedTrip.created_at.desc()).all()

        return {
            "sync_code": sync_code.upper(),
            "trips": [
                {
                    "id": t.trip_id,
                    "query": t.query,
                    "summary": t.summary,
                    "days": json.loads(t.trip_data),
                    "savedAt": t.created_at.isoformat()
                }
                for t in trips
            ]
        }
    finally:
        session.close()


@app.post("/trips/{sync_code}")
def save_trip(sync_code: str, trip: SaveTripRequest):
    """Save a trip."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        # Check if trip already exists
        existing = session.query(SavedTrip).filter(
            SavedTrip.sync_code == sync_code.upper(),
            SavedTrip.trip_id == trip.trip_id
        ).first()

        if existing:
            return {"message": "Trip already saved", "id": existing.trip_id}

        saved_trip = SavedTrip(
            sync_code=sync_code.upper(),
            trip_id=trip.trip_id,
            query=trip.query,
            summary=trip.summary,
            trip_data=json.dumps(trip.days)
        )
        session.add(saved_trip)
        session.commit()

        return {"message": "Trip saved", "id": saved_trip.trip_id}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        session.close()


@app.delete("/trips/{sync_code}/{trip_id}")
def delete_trip(sync_code: str, trip_id: str):
    """Delete a saved trip."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        trip = session.query(SavedTrip).filter(
            SavedTrip.sync_code == sync_code.upper(),
            SavedTrip.trip_id == trip_id
        ).first()

        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        session.delete(trip)
        session.commit()

        return {"message": "Trip deleted"}
    finally:
        session.close()


# =============================================================================
# TRIP UPDATE ENDPOINT (PATCH)
# =============================================================================

class TripUpdateRequest(BaseModel):
    """Request model for updating a trip."""
    query: str | None = None
    summary: str | None = None
    days: list | None = None


@app.patch("/trips/{sync_code}/{trip_id}")
def update_trip(sync_code: str, trip_id: str, updates: TripUpdateRequest):
    """Update an existing saved trip (partial update)."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        trip = session.query(SavedTrip).filter(
            SavedTrip.sync_code == sync_code.upper(),
            SavedTrip.trip_id == trip_id
        ).first()

        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        # Apply partial updates
        if updates.query is not None:
            trip.query = updates.query
        if updates.summary is not None:
            trip.summary = updates.summary
        if updates.days is not None:
            trip.trip_data = json.dumps(updates.days)

        session.commit()

        return {
            "message": "Trip updated",
            "id": trip.trip_id,
            "updated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        session.close()


# =============================================================================
# BUDGET CALCULATION ENDPOINT
# =============================================================================

# Cost estimates per price level (in USD)
COST_ESTIMATES = {
    "food": {1: 15, 2: 30, 3: 60, 4: 120},
    "hotel": {1: 80, 2: 150, 3: 300, 4: 500},
    "attraction": {1: 10, 2: 25, 3: 50, 4: 100},
    "activity": {1: 20, 2: 50, 3: 100, 4: 200},
    "drive": {1: 0, 2: 0, 3: 0, 4: 0},
}


class PlaylistRequest(BaseModel):
    """Request model for playlist generation."""
    query: str  # The trip query to generate playlist for


class PlaylistSong(BaseModel):
    """A song in the playlist."""
    title: str
    artist: str


class PlaylistResponse(BaseModel):
    """Response model for playlist generation."""
    region: str
    vibe: str
    songs: list[PlaylistSong]


class BudgetRequest(BaseModel):
    """Request model for budget calculation."""
    days: list  # List of DayPlan objects


class BudgetResponse(BaseModel):
    """Response model for budget calculation."""
    total_estimated: float
    by_day: list[float]
    by_category: dict[str, float]


@app.post("/calculate-budget", response_model=BudgetResponse)
def calculate_budget(request: BudgetRequest):
    """Calculate estimated costs for a trip based on place price levels."""
    by_day = []
    by_category = {"food": 0.0, "hotel": 0.0, "attraction": 0.0, "activity": 0.0}

    for day in request.days:
        day_total = 0.0
        activities = day.get("activities", []) if isinstance(day, dict) else getattr(day, "activities", [])

        for activity in activities:
            if isinstance(activity, dict):
                activity_type = activity.get("activity_type", "activity")
                place = activity.get("place")
                price_level = place.get("price_level", 2) if place else 2
            else:
                activity_type = getattr(activity, "activity_type", "activity")
                place = getattr(activity, "place", None)
                price_level = getattr(place, "price_level", 2) if place else 2

            # Get cost estimate
            if activity_type in COST_ESTIMATES:
                cost = COST_ESTIMATES[activity_type].get(price_level or 2, 0)
                day_total += cost
                if activity_type in by_category:
                    by_category[activity_type] += cost

        by_day.append(day_total)

    return BudgetResponse(
        total_estimated=sum(by_day),
        by_day=by_day,
        by_category=by_category
    )


# =============================================================================
# PLAYLIST GENERATION ENDPOINT
# =============================================================================

PLAYLIST_SYSTEM_PROMPT = """You are an expert music curator creating the ultimate road trip playlist. Based on the trip destination and vibe, suggest 30 songs that perfectly capture the spirit of the journey.

Respond with valid JSON only:
{
  "region": "Short region name (e.g., 'Texas', 'Pacific Coast', 'Deep South')",
  "vibe": "A short poetic description of the musical vibe (e.g., 'Dust, boots, and endless highways')",
  "songs": [
    {"title": "Song Title", "artist": "Artist Name"},
    ...
  ]
}

GUIDELINES:
- Include exactly 30 songs - enough for a solid 2+ hour drive
- Prioritize GREAT driving songs - songs with energy, atmosphere, or emotional resonance for the road
- Mix timeless classics (60s-90s) with modern hits (2000s-present) - aim for 50/50 balance
- Include artists FROM the region, not just songs ABOUT the region
- Vary the tempo: start upbeat, mix in some mellow middle sections, build energy for the final stretch

REGIONAL DEEP CUTS (go beyond the obvious):
- For Texas: Willie Nelson, Waylon Jennings, George Strait, Townes Van Zandt, Kacey Musgraves, Khruangbin, ZZ Top, Selena, Grupo Fantasma, Gary Clark Jr., Leon Bridges
- For California: Eagles, Tom Petty, Fleetwood Mac, Red Hot Chili Peppers, Sublime, Kendrick Lamar, The Beach Boys, Joni Mitchell, Dr. Dre, Beck
- For Nashville/Tennessee: Johnny Cash, Dolly Parton, Chris Stapleton, Sturgill Simpson, Jason Isbell, The Black Keys, Kings of Leon, Jack White
- For New Orleans/Louisiana: Dr. John, The Meters, Trombone Shorty, Irma Thomas, Allen Toussaint, Clifton Chenier, Lucinda Williams, Better Than Ezra
- For Florida: Tom Petty, Lynyrd Skynyrd, The Allman Brothers, Jimmy Buffett, Pitbull, Gloria Estefan, Against Me!
- For Pacific Northwest: Nirvana, Pearl Jam, Soundgarden, Fleet Foxes, Death Cab for Cutie, Modest Mouse, Heart, Jimi Hendrix
- For Southwest/Arizona: Calexico, Giant Sand, Meat Puppets, Jimmy Eat World, The Refreshments, Roger Clyne
- For New England: Aerosmith, The Pixies, James Taylor, Dispatch, Vampire Weekend, The Cars
- For Colorado: John Denver, Big Head Todd, The Lumineers, Nathaniel Rateliff, String Cheese Incident
- For general road trips: classic rock anthems, 70s/80s hits, singalong favorites

SONG SELECTION CRITERIA:
- Every song should make you want to roll the windows down or sing along
- Include at least 5 deep cuts or lesser-known gems alongside the hits
- Avoid overly slow ballads or songs that kill driving momentum
- Songs must be real and findable on Spotify/Apple Music
- Create a playlist that flows - don't put two slow songs back to back"""


async def generate_playlist(query: str) -> dict:
    """Generate a road trip playlist using OpenAI."""
    if openai_client is None:
        raise HTTPException(status_code=503, detail="OpenAI client not initialized")

    allowed, reason = openai_limiter.check()
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": PLAYLIST_SYSTEM_PROMPT},
                {"role": "user", "content": f"Create a playlist for this road trip: {query}"}
            ]
        )
        openai_limiter.record()

        response_text = response.choices[0].message.content
        return json.loads(response_text)

    except openai.APIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse playlist response")


@app.post("/playlist", response_model=PlaylistResponse)
async def create_playlist(request: PlaylistRequest):
    """
    Generate a road trip playlist based on the trip destination.

    Returns 30 songs curated for the region and vibe of the trip.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    playlist_data = await generate_playlist(request.query)

    songs = [
        PlaylistSong(title=s.get("title", ""), artist=s.get("artist", ""))
        for s in playlist_data.get("songs", [])
    ]

    return PlaylistResponse(
        region=playlist_data.get("region", "Road Trip"),
        vibe=playlist_data.get("vibe", "Perfect for any adventure"),
        songs=songs
    )


# =============================================================================
# WEATHER ENDPOINT
# =============================================================================

class WeatherLocation(BaseModel):
    """A location and date for weather forecast."""
    lat: float
    lng: float
    date: str  # YYYY-MM-DD format


class WeatherForecast(BaseModel):
    """Weather forecast for a specific day and location."""
    date: str
    location: str
    temperature_high: float
    temperature_low: float
    condition: str
    precipitation_chance: int
    icon: str


class WeatherRequest(BaseModel):
    """Request model for weather forecasts."""
    locations: list[WeatherLocation]


class WeatherResponse(BaseModel):
    """Response model for weather forecasts."""
    forecasts: list[WeatherForecast]


# Weather rate limiter
weather_limiter = RateLimiter(30, 500, "Weather")


@app.post("/weather", response_model=WeatherResponse)
async def get_weather(request: WeatherRequest):
    """
    Get weather forecasts for trip locations and dates.
    Uses WeatherAPI.com for up to 14-day forecasts.
    """
    if not WEATHER_API_KEY:
        raise HTTPException(status_code=503, detail="Weather API not configured")

    allowed, reason = weather_limiter.check()
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)

    forecasts = []

    for loc in request.locations:
        try:
            # WeatherAPI.com forecast endpoint
            url = f"https://api.weatherapi.com/v1/forecast.json?key={WEATHER_API_KEY}&q={loc.lat},{loc.lng}&dt={loc.date}&aqi=no"

            response = await http_client.get(url)
            weather_limiter.record()

            if response.status_code == 200:
                data = response.json()
                location_name = data.get("location", {}).get("name", "Unknown")
                forecast_day = data.get("forecast", {}).get("forecastday", [{}])[0]
                day_data = forecast_day.get("day", {})

                forecasts.append(WeatherForecast(
                    date=loc.date,
                    location=location_name,
                    temperature_high=day_data.get("maxtemp_f", 75),
                    temperature_low=day_data.get("mintemp_f", 55),
                    condition=day_data.get("condition", {}).get("text", "Unknown"),
                    precipitation_chance=day_data.get("daily_chance_of_rain", 0),
                    icon=day_data.get("condition", {}).get("icon", ""),
                ))
            else:
                # Return a placeholder if API fails for this location
                forecasts.append(WeatherForecast(
                    date=loc.date,
                    location="Unknown",
                    temperature_high=75,
                    temperature_low=55,
                    condition="Unknown",
                    precipitation_chance=0,
                    icon="",
                ))

        except Exception as e:
            print(f"Weather API error for {loc.lat},{loc.lng}: {e}")
            # Return placeholder on error
            forecasts.append(WeatherForecast(
                date=loc.date,
                location="Unknown",
                temperature_high=75,
                temperature_low=55,
                condition="Unknown",
                precipitation_chance=0,
                icon="",
            ))

    return WeatherResponse(forecasts=forecasts)


# =============================================================================
# AUTHENTICATION
# =============================================================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_jwt_token(user_id: int, email: str, sync_code: str) -> str:
    """Create a JWT token for a user."""
    payload = {
        "user_id": user_id,
        "email": email,
        "sync_code": sync_code,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> dict | None:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Dependency to get the current authenticated user from JWT."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = parts[1]
    payload = decode_jwt_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


class RegisterRequest(BaseModel):
    """Request model for user registration."""
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: str
    password: str


class AuthResponse(BaseModel):
    """Response model for auth endpoints."""
    token: str
    user: dict


@app.post("/auth/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    """Register a new user account."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    # Validate password strength
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    session = SessionLocal()
    try:
        # Check if email already exists
        existing_email = session.query(User).filter(User.email == request.email.lower()).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if username already exists
        existing_username = session.query(User).filter(User.username == request.username.lower()).first()
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")

        # Generate unique sync code
        sync_code = generate_sync_code()
        while session.query(User).filter(User.sync_code == sync_code).first():
            sync_code = generate_sync_code()

        # Create user
        user = User(
            email=request.email.lower(),
            username=request.username.lower(),
            password_hash=hash_password(request.password),
            sync_code=sync_code
        )
        session.add(user)
        session.commit()

        # Generate JWT token
        token = create_jwt_token(user.id, user.email, user.sync_code)

        return AuthResponse(
            token=token,
            user={
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "sync_code": user.sync_code
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        session.close()


@app.post("/auth/login", response_model=AuthResponse)
def login(request: LoginRequest):
    """Log in to an existing account."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        # Find user by email
        user = session.query(User).filter(User.email == request.email.lower()).first()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is disabled")

        # Verify password
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Generate JWT token
        token = create_jwt_token(user.id, user.email, user.sync_code)

        return AuthResponse(
            token=token,
            user={
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "sync_code": user.sync_code
            }
        )
    finally:
        session.close()


@app.get("/auth/me")
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's info."""
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not configured")

    session = SessionLocal()
    try:
        user = session.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "sync_code": user.sync_code
        }
    finally:
        session.close()
