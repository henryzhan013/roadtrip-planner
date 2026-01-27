"""
Search places by vibe using semantic similarity.

This script lets you test vibe-based search on your embedded place data.
Type a description of what you're looking for, and it returns the best matches.

Usage:
    python search_places.py "chill dive bar with live country music"
    python search_places.py  # interactive mode
"""

import json
import sys
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDINGS_FILE = Path(__file__).parent / "output" / "places_with_embeddings.json"


# =============================================================================
# SIMILARITY MATH
# =============================================================================

def cosine_similarity(vec1, vec2):
    """
    Compute cosine similarity between two vectors.

    Cosine similarity measures the angle between vectors:
    - 1.0 = identical direction (same meaning)
    - 0.0 = perpendicular (unrelated)
    - -1.0 = opposite direction (opposite meaning)

    For embeddings, higher = more similar meaning.
    """
    # Dot product
    dot_product = sum(a * b for a, b in zip(vec1, vec2))

    # Magnitudes
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5

    # Avoid division by zero
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)


# =============================================================================
# SEARCH FUNCTION
# =============================================================================

def search(query, places, model, top_k=5):
    """
    Find places that match the query vibe.

    How it works:
    1. Convert query text to embedding (same model as places)
    2. Compare query embedding to every place embedding
    3. Return places with highest similarity scores

    This is "semantic search" - it finds meaning similarity, not keyword matches.
    "dive bar with dancing" will match "honky-tonk with two-stepping"
    even though they share no words.
    """
    # Embed the query
    query_embedding = model.encode(query).tolist()

    # Score all places
    results = []
    for place in places:
        score = cosine_similarity(query_embedding, place["embedding"])
        results.append({
            "place": place,
            "score": score,
        })

    # Sort by similarity (highest first)
    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:top_k]


def format_result(result, rank):
    """Format a search result for display."""
    place = result["place"]
    score = result["score"]

    # Location (extract city/state from address)
    address = place.get("address", "")
    location = ", ".join(address.split(", ")[-3:-1]) if address else "Unknown"

    # Truncate description
    desc = place.get("description") or "(no description)"
    if len(desc) > 100:
        desc = desc[:100] + "..."

    return f"""
{rank}. {place['name']}
   Location: {location}
   Rating: {place.get('rating', 'N/A')} ({place.get('rating_count', 0):,} reviews)
   Match: {score:.1%}
   {desc}
"""


# =============================================================================
# MAIN
# =============================================================================

def main():
    # Load embeddings
    print(f"Loading embeddings from: {EMBEDDINGS_FILE}")

    if not EMBEDDINGS_FILE.exists():
        print(f"Error: {EMBEDDINGS_FILE} not found")
        print("Run compute_embeddings.py first.")
        sys.exit(1)

    with open(EMBEDDINGS_FILE) as f:
        data = json.load(f)

    places = data["places"]
    print(f"Loaded {len(places)} places with embeddings\n")

    # Load model (same one used for embeddings)
    print("Loading model...")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    print("Ready!\n")

    # Check for command line query
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        print(f"Searching for: \"{query}\"\n")
        print("=" * 60)

        results = search(query, places, model)
        for i, result in enumerate(results, 1):
            print(format_result(result, i))

        return

    # Interactive mode
    print("=" * 60)
    print("VIBE SEARCH - Type what you're looking for")
    print("=" * 60)
    print("\nExamples:")
    print('  "chill dive bar with live music and dancing"')
    print('  "authentic texas honky tonk"')
    print('  "fun place for two-stepping and cold beer"')
    print('  "rowdy bar with bull riding"')
    print("\nType 'quit' to exit\n")

    while True:
        try:
            query = input("Search: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not query:
            continue

        if query.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        print(f"\nSearching for: \"{query}\"\n")
        print("-" * 60)

        results = search(query, places, model)
        for i, result in enumerate(results, 1):
            print(format_result(result, i))

        print()


if __name__ == "__main__":
    main()
