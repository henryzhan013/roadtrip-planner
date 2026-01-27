"""
Fetch places from Google Places API for road trip planning.

Usage:
    export GOOGLE_PLACES_API_KEY="your-api-key"
    python fetch_places.py

Customize searches by editing SEARCH_CONFIGS below.
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
import urllib.request

# =============================================================================
# CONFIGURATION - Edit these to change what places you're searching for
# =============================================================================

SEARCH_CONFIGS = [
    # Each config searches for a category in specific regions
    # Add more configs here to search for different place types
    {
        "category": "honky_tonk",
        "queries": [
            "honky tonk bars in Texas",
            "honky tonk bars in Nashville Tennessee",
            "country dance hall in Texas",
            "country western bar in Austin Texas",
            "country bar in Fort Worth Texas",
            "honky tonk in Oklahoma",
            "country dance hall in Tennessee",
            "country bar in Kentucky",
            "honky tonk bar in Missouri",
            "country western bar in Arizona",
        ],
        "max_results_per_query": 5,  # Limit per query to spread across regions
    },
]

# Example of how to add more categories later:
# {
#     "category": "bbq",
#     "queries": [
#         "best bbq restaurant in Texas",
#         "bbq smokehouse in Kansas City",
#         "southern bbq in Memphis Tennessee",
#     ],
#     "max_results_per_query": 10,
# },


# =============================================================================
# API INTERACTION
# =============================================================================

BASE_URL = "https://maps.googleapis.com/maps/api/place"


def get_api_key():
    """Get API key from environment variable."""
    key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not key:
        raise ValueError(
            "Missing GOOGLE_PLACES_API_KEY environment variable.\n"
            "Set it with: export GOOGLE_PLACES_API_KEY='your-key-here'"
        )
    return key


def make_request(url):
    """Make HTTP request and return JSON response."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode())


def text_search(query, api_key):
    """
    Search for places matching a text query.

    Returns list of places with basic info (name, address, location, rating).
    Google returns up to 20 results per request.
    """
    params = {
        "query": query,
        "key": api_key,
    }
    url = f"{BASE_URL}/textsearch/json?{urlencode(params)}"

    response = make_request(url)

    if response.get("status") != "OK":
        print(f"  Warning: Search returned status '{response.get('status')}'")
        if response.get("error_message"):
            print(f"  Error: {response.get('error_message')}")
        return []

    return response.get("results", [])


def get_place_details(place_id, api_key):
    """
    Fetch detailed info for a single place, including reviews.

    The Text Search only returns basic info. To get reviews and other
    details, we need to make a separate Place Details request.
    """
    params = {
        "place_id": place_id,
        "key": api_key,
        # Specify which fields we want (controls cost and response size)
        "fields": ",".join([
            "name",
            "formatted_address",
            "geometry",
            "rating",
            "user_ratings_total",
            "reviews",
            "editorial_summary",
            "types",
            "business_status",
            "website",
            "formatted_phone_number",
        ]),
    }
    url = f"{BASE_URL}/details/json?{urlencode(params)}"

    response = make_request(url)

    if response.get("status") != "OK":
        print(f"  Warning: Details request returned '{response.get('status')}'")
        return None

    return response.get("result")


# =============================================================================
# DATA PROCESSING
# =============================================================================

def extract_place_data(place_details, category):
    """
    Extract the fields we care about from the API response.

    This normalizes the data into a clean structure for our use.
    """
    if not place_details:
        return None

    # Get location coordinates
    geometry = place_details.get("geometry", {})
    location = geometry.get("location", {})

    # Extract review texts (we'll use these for embeddings later)
    reviews = place_details.get("reviews", [])
    review_texts = [r.get("text", "") for r in reviews if r.get("text")]

    return {
        "name": place_details.get("name"),
        "address": place_details.get("formatted_address"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "rating": place_details.get("rating"),
        "rating_count": place_details.get("user_ratings_total"),
        "description": place_details.get("editorial_summary", {}).get("overview"),
        "reviews": review_texts,
        "types": place_details.get("types", []),
        "website": place_details.get("website"),
        "phone": place_details.get("formatted_phone_number"),
        "business_status": place_details.get("business_status"),
        "category": category,  # Our category tag for filtering
        "place_id": place_details.get("place_id"),  # For deduplication
    }


def deduplicate_places(places):
    """Remove duplicate places based on place_id."""
    seen = set()
    unique = []
    for place in places:
        if place["place_id"] not in seen:
            seen.add(place["place_id"])
            unique.append(place)
    return unique


# =============================================================================
# MAIN PIPELINE
# =============================================================================

def fetch_places_for_config(config, api_key):
    """
    Run all searches for a single config and return collected places.
    """
    category = config["category"]
    queries = config["queries"]
    max_per_query = config.get("max_results_per_query", 10)

    print(f"\n{'='*60}")
    print(f"Fetching category: {category}")
    print(f"{'='*60}")

    all_places = []

    for query in queries:
        print(f"\nSearching: '{query}'")

        # Step 1: Text search to find places
        search_results = text_search(query, api_key)
        print(f"  Found {len(search_results)} results")

        # Limit results per query to spread across regions
        search_results = search_results[:max_per_query]

        # Step 2: Fetch details for each place (includes reviews)
        for i, result in enumerate(search_results):
            place_id = result.get("place_id")
            place_name = result.get("name", "Unknown")

            print(f"  [{i+1}/{len(search_results)}] Getting details: {place_name}")

            details = get_place_details(place_id, api_key)
            if details:
                # Add place_id to details for deduplication
                details["place_id"] = place_id
                place_data = extract_place_data(details, category)
                if place_data:
                    all_places.append(place_data)

            # Be nice to the API - small delay between requests
            time.sleep(0.2)

    return all_places


def run_pipeline(configs=None):
    """
    Main entry point. Runs all search configs and saves results.
    """
    if configs is None:
        configs = SEARCH_CONFIGS

    api_key = get_api_key()

    all_places = []

    for config in configs:
        places = fetch_places_for_config(config, api_key)
        all_places.extend(places)

    # Remove duplicates (same place might appear in multiple searches)
    unique_places = deduplicate_places(all_places)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total places collected: {len(all_places)}")
    print(f"After deduplication: {len(unique_places)}")

    # Save to JSON file
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"places_{timestamp}.json"

    output_data = {
        "fetched_at": datetime.now().isoformat(),
        "total_places": len(unique_places),
        "places": unique_places,
    }

    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"Saved to: {output_file}")

    # Also save a "latest" symlink/copy for convenience
    latest_file = output_dir / "places_latest.json"
    with open(latest_file, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"Also saved to: {latest_file}")

    return unique_places


if __name__ == "__main__":
    run_pipeline()
