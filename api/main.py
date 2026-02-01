"""
FastAPI backend for vibe-based place search.

Exposes the search functionality as a REST API so frontends can call it.

Run with:
    uvicorn api.main:app --reload

Or from the api directory:
    uvicorn main:app --reload
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =============================================================================
# CONFIGURATION
# =============================================================================

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDINGS_FILE = Path(__file__).parent.parent / "data_pipeline" / "output" / "places_with_embeddings.json"


# =============================================================================
# GLOBAL STATE (loaded once at startup)
# =============================================================================

# These get populated when the app starts
places: list = []
places_by_id: dict = {}
model = None


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class PlaceSummary(BaseModel):
    """Minimal place info for list views."""
    place_id: str
    name: str
    address: str
    lat: float
    lng: float
    rating: float | None
    rating_count: int
    category: str


class PlaceDetail(BaseModel):
    """Full place info (excludes embedding - that's internal)."""
    place_id: str
    name: str
    address: str
    lat: float
    lng: float
    rating: float | None
    rating_count: int
    description: str | None
    reviews: list[str]
    types: list[str]
    website: str | None
    phone: str | None
    business_status: str
    category: str


class SearchResult(BaseModel):
    """A place with its similarity score."""
    place: PlaceSummary
    score: float
    score_percentage: str  # "87.3%" - easier for frontend


class SearchResponse(BaseModel):
    """Response for /search endpoint."""
    query: str
    results: list[SearchResult]


class PlacesResponse(BaseModel):
    """Response for /places endpoint."""
    total: int
    places: list[PlaceSummary]


# =============================================================================
# SIMILARITY LOGIC (copied from search_places.py)
# =============================================================================

def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Returns value between -1 and 1, where 1 = identical meaning.
    """
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5

    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)


def search_places(query: str, top_k: int = 5) -> list[dict]:
    """
    Find places matching the query vibe.
    Returns list of {place, score} dicts.
    """
    # Encode the query using the same model
    query_embedding = model.encode(query).tolist()

    # Score all places
    results = []
    for place in places:
        score = cosine_similarity(query_embedding, place["embedding"])
        results.append({"place": place, "score": score})

    # Sort by similarity (highest first)
    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:top_k]


# =============================================================================
# LIFESPAN: Load data and model once at startup
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once when the app starts (before serving requests)
    and once when it shuts down.

    We load the embeddings file and ML model here so we don't
    re-load them on every request.
    """
    global places, places_by_id, model

    # --- STARTUP ---
    print(f"Loading embeddings from: {EMBEDDINGS_FILE}")

    if not EMBEDDINGS_FILE.exists():
        raise RuntimeError(
            f"Embeddings file not found: {EMBEDDINGS_FILE}\n"
            "Run compute_embeddings.py first."
        )

    with open(EMBEDDINGS_FILE) as f:
        data = json.load(f)

    places = data["places"]
    places_by_id = {p["place_id"]: p for p in places}
    print(f"Loaded {len(places)} places")

    print(f"Loading model: {MODEL_NAME}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    print("Model loaded. Ready to serve requests!")

    yield  # App runs here

    # --- SHUTDOWN ---
    print("Shutting down...")


# =============================================================================
# CREATE APP
# =============================================================================

app = FastAPI(
    title="Road Trip Planner API",
    description="Vibe-based place search for road trips",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow frontend to call this API from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, list specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def make_place_summary(place: dict) -> PlaceSummary:
    """Convert raw place dict to PlaceSummary model."""
    return PlaceSummary(
        place_id=place["place_id"],
        name=place["name"],
        address=place["address"],
        lat=place["lat"],
        lng=place["lng"],
        rating=place.get("rating"),
        rating_count=place.get("rating_count", 0),
        category=place.get("category", ""),
    )


def make_place_detail(place: dict) -> PlaceDetail:
    """Convert raw place dict to PlaceDetail model."""
    return PlaceDetail(
        place_id=place["place_id"],
        name=place["name"],
        address=place["address"],
        lat=place["lat"],
        lng=place["lng"],
        rating=place.get("rating"),
        rating_count=place.get("rating_count", 0),
        description=place.get("description"),
        reviews=place.get("reviews", []),
        types=place.get("types", []),
        website=place.get("website"),
        phone=place.get("phone"),
        business_status=place.get("business_status", ""),
        category=place.get("category", ""),
    )


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/search", response_model=SearchResponse)
def search(
    query: str = Query(..., min_length=1, description="What vibe are you looking for?"),
    limit: int = Query(5, ge=1, le=20, description="Number of results"),
):
    """
    Search for places by vibe.

    This uses semantic search - it understands meaning, not just keywords.
    Try queries like:
    - "chill dive bar with live music"
    - "authentic texas honky tonk"
    - "rowdy bar with bull riding"
    """
    results = search_places(query, top_k=limit)

    return SearchResponse(
        query=query,
        results=[
            SearchResult(
                place=make_place_summary(r["place"]),
                score=round(r["score"], 4),
                score_percentage=f"{r['score']:.1%}",
            )
            for r in results
        ],
    )


@app.get("/places", response_model=PlacesResponse)
def get_all_places():
    """
    Get all places (for displaying on a map).

    Returns summary info only - use /places/{place_id} for full details.
    """
    return PlacesResponse(
        total=len(places),
        places=[make_place_summary(p) for p in places],
    )


@app.get("/places/{place_id}", response_model=PlaceDetail)
def get_place(place_id: str):
    """
    Get full details for a specific place.
    """
    place = places_by_id.get(place_id)

    if not place:
        raise HTTPException(
            status_code=404,
            detail=f"Place not found: {place_id}",
        )

    return make_place_detail(place)


@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "places_loaded": len(places),
        "model_loaded": model is not None,
    }
