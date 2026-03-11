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
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

# Load environment variables
load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

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

PLAN_SYSTEM_PROMPT = """You are a detailed travel planner. Create hour-by-hour road trip itineraries with specific times.

Respond with valid JSON only:
{
  "summary": "Brief trip summary",
  "days": [
    {
      "day": 1,
      "date_label": "Austin to San Antonio",
      "activities": [
        {"activity_type": "food", "time_slot": "8:00 AM", "description": "Grab breakfast tacos before hitting the road", "search_query": "best breakfast tacos Austin TX"},
        {"activity_type": "drive", "time_slot": "9:30 AM", "description": "Drive to San Antonio (1.5 hours)", "search_query": null},
        {"activity_type": "attraction", "time_slot": "11:00 AM", "description": "Visit the Alamo and learn about Texas history", "search_query": "The Alamo San Antonio TX"},
        {"activity_type": "food", "time_slot": "1:00 PM", "description": "Lunch at a famous Tex-Mex spot", "search_query": "best Tex-Mex restaurant San Antonio TX"},
        {"activity_type": "activity", "time_slot": "3:00 PM", "description": "Walk along the River Walk, explore shops and scenery", "search_query": "San Antonio River Walk"},
        {"activity_type": "food", "time_slot": "7:00 PM", "description": "Dinner with river views", "search_query": "riverside restaurant San Antonio TX"},
        {"activity_type": "hotel", "time_slot": "9:00 PM", "description": "Check into hotel downtown", "search_query": "hotel near River Walk San Antonio TX"}
      ]
    }
  ]
}

REQUIRED STRUCTURE FOR EACH DAY:
- Morning (8-9 AM): Breakfast or early start
- Late Morning (10 AM - 12 PM): First activity or drive
- Lunch (12-2 PM): Always include a specific lunch spot
- Afternoon (2-5 PM): 1-2 activities
- Dinner (6-8 PM): Always include a specific dinner spot
- Evening (8-10 PM): Optional nightlife, hotel check-in, or sunset activity

TIME SLOT FORMAT:
- Use specific times like "8:00 AM", "12:30 PM", "6:00 PM"
- For flexible activities use "Morning", "Afternoon", "Evening"

activity_type options: "drive", "food", "attraction", "activity", "hotel"
search_query: MUST include city and state for accurate Google Places results

Guidelines:
- ALWAYS include breakfast, lunch, AND dinner for each day
- Be specific: "Visit the famous South Congress Avenue murals" not just "explore the area"
- Include realistic drive times between locations
- search_query should be specific: "best BBQ restaurant Austin TX" not just "restaurant"
- Match the user's interests (foodie trip = more restaurant variety, adventure = more activities)
- Last day can end with departure, no hotel needed
- Include a mix of must-see attractions and local hidden gems"""


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
