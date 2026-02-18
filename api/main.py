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

# Load environment variables
load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

# Rate limits
OPENAI_RATE_LIMIT_PER_MINUTE = int(os.getenv("OPENAI_RATE_LIMIT_PER_MINUTE", "60"))
OPENAI_RATE_LIMIT_PER_DAY = int(os.getenv("OPENAI_RATE_LIMIT_PER_DAY", "1000"))
GOOGLE_RATE_LIMIT_PER_MINUTE = int(os.getenv("GOOGLE_RATE_LIMIT_PER_MINUTE", "60"))
GOOGLE_RATE_LIMIT_PER_DAY = int(os.getenv("GOOGLE_RATE_LIMIT_PER_DAY", "1000"))

# Cache TTL
CACHE_TTL_SECONDS = 30 * 60  # 30 minutes


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


class SearchResponse(BaseModel):
    """Response for /search endpoint."""
    query: str
    results: list[PlaceSummary]


class PlanRequest(BaseModel):
    """Request body for /plan endpoint."""
    query: str


class DayStop(BaseModel):
    """A day's worth of places."""
    day: int
    city: str
    places: list[PlaceSummary]


class PlanResponse(BaseModel):
    """Response for /plan endpoint."""
    query: str
    stops: list[DayStop]


# =============================================================================
# LLM INTEGRATION
# =============================================================================

PLAN_SYSTEM_PROMPT = """You are a travel planning assistant. Given a natural language trip request, extract structured information to help plan the trip.

You must respond with valid JSON only, no other text. The JSON should have this structure:
{
  "duration_days": <number>,
  "cities": ["city1", "city2", ...],
  "searches": [
    {
      "city": "city name",
      "day": <day number>,
      "queries": ["search query 1", "search query 2"],
      "why": {"query1": "reason this is recommended", "query2": "reason"}
    }
  ]
}

Guidelines:
- Extract duration from the query (e.g., "7 days", "weekend" = 2 days, "week" = 7 days)
- Choose appropriate cities for the region/route mentioned
- Create specific search queries that will work well with Google Places (e.g., "honky tonk bars Austin TX")
- Provide a brief "why" explanation for each type of place
- Spread cities across the days appropriately
- Limit to 2-3 search queries per city to keep results focused
- Always include the state/region in search queries for better results"""


async def call_openai(query: str) -> dict:
    """Parse user query into search plan using OpenAI."""
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

        # Parse the response
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType"
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
            results.append({
                "place_id": place.get("id", ""),
                "name": place.get("displayName", {}).get("text", ""),
                "address": place.get("formattedAddress", ""),
                "lat": location.get("latitude", 0),
                "lng": location.get("longitude", 0),
                "rating": place.get("rating"),
                "rating_count": place.get("userRatingCount", 0),
                "category": place.get("primaryType", ""),
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
    global openai_client, http_client

    # Validate API keys
    if not OPENAI_API_KEY:
        print("WARNING: OPENAI_API_KEY not set. /plan endpoint will not work.")
    else:
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
        print("OpenAI client initialized")

    if not GOOGLE_PLACES_API_KEY:
        print("WARNING: GOOGLE_PLACES_API_KEY not set. Search endpoints will not work.")

    http_client = httpx.AsyncClient(timeout=30.0)
    print("HTTP client initialized")
    print("Ready to serve requests!")

    yield

    # Cleanup
    if http_client:
        await http_client.aclose()
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

    Simple search without LLM processing. Good for queries like:
    - "coffee shops austin tx"
    - "honky tonk bars fort worth"
    - "bbq restaurants san antonio"
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
    Create a trip plan using natural language.

    The LLM parses your query to understand:
    - Trip duration
    - Cities/route
    - Types of places you want

    Then searches Google Places for each city and returns a day-by-day itinerary.

    Example queries:
    - "7 day roadtrip through texas with honky tonk bars and bbq"
    - "weekend trip austin for live music and tacos"
    - "3 days in san antonio historic sites and mexican food"
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=503, detail="Google Places API key not configured")

    # Step 1: Parse query with OpenAI
    plan = await call_openai(request.query)

    # Step 2: Search Google Places for each query
    stops: list[DayStop] = []
    searches = plan.get("searches", [])

    for search_info in searches:
        city = search_info.get("city", "")
        day = search_info.get("day", 1)
        queries = search_info.get("queries", [])
        why_map = search_info.get("why", {})

        city_places: list[PlaceSummary] = []

        for query in queries:
            try:
                results = await search_google_places(query, max_results=3)
                why_text = why_map.get(query, "")

                for r in results:
                    place = PlaceSummary(**r, why=why_text)
                    city_places.append(place)
            except HTTPException:
                # Skip failed queries, continue with others
                continue

        if city_places:
            stops.append(DayStop(day=day, city=city, places=city_places))

    # Sort by day
    stops.sort(key=lambda s: s.day)

    return PlanResponse(
        query=request.query,
        stops=stops,
    )


@app.get("/health")
def health_check():
    """Health check with rate limit status."""
    return {
        "status": "healthy",
        "openai_configured": OPENAI_API_KEY is not None,
        "google_configured": GOOGLE_PLACES_API_KEY is not None,
        "rate_limits": {
            "openai": openai_limiter.status(),
            "google": google_limiter.status(),
        },
        "cache_entries": len(places_cache.cache),
    }
