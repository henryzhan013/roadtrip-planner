"""
Compute embeddings for place data using sentence-transformers.

This script takes the raw place data (from fetch_places.py) and adds
vector embeddings that capture the "vibe" of each place based on its
name, description, and reviews.

Usage:
    pip install sentence-transformers
    python compute_embeddings.py

The output file can then be used for similarity search.
"""

import json
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================

# Model choice: all-MiniLM-L6-v2 is a good balance of speed and quality
# - 384 dimensions (smaller = faster search)
# - ~80MB download on first run
# - Good semantic understanding for English text
MODEL_NAME = "all-MiniLM-L6-v2"

# Input/output paths
INPUT_FILE = Path(__file__).parent / "output" / "places_latest.json"
OUTPUT_FILE = Path(__file__).parent / "output" / "places_with_embeddings.json"


# =============================================================================
# TEXT PREPARATION
# =============================================================================

def prepare_text_for_embedding(place):
    """
    Combine place fields into a single text string for embedding.

    The embedding model will convert this text into a vector that captures
    its semantic meaning. We want to include all the "vibe" information:
    - Name (e.g., "Broken Spoke")
    - Description (e.g., "legendary honky-tonk with live music")
    - Reviews (where most of the vibe language lives)

    We structure it to give the model clear context about what it's reading.
    """
    parts = []

    # Start with the name
    name = place.get("name", "")
    if name:
        parts.append(f"Name: {name}")

    # Add description if available (not all places have one)
    description = place.get("description")
    if description:
        parts.append(f"Description: {description}")

    # Add reviews - these contain the richest vibe language
    reviews = place.get("reviews", [])
    if reviews:
        # Join all reviews into one block
        # Limit total length to avoid very long texts (model has max input size)
        reviews_text = " ".join(reviews)
        # Truncate if too long (model handles ~256 tokens well, ~512 max)
        max_chars = 2000
        if len(reviews_text) > max_chars:
            reviews_text = reviews_text[:max_chars] + "..."
        parts.append(f"Reviews: {reviews_text}")

    # Add category as a hint
    category = place.get("category")
    if category:
        parts.append(f"Category: {category.replace('_', ' ')}")

    return "\n".join(parts)


# =============================================================================
# EMBEDDING COMPUTATION
# =============================================================================

def load_model():
    """
    Load the sentence-transformers model.

    On first run, this downloads the model (~80MB).
    Subsequent runs load from cache instantly.
    """
    print(f"Loading model: {MODEL_NAME}")
    print("(First run will download ~80MB, then it's cached)")

    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)

    print(f"Model loaded. Embedding dimension: {model.get_sentence_embedding_dimension()}")
    return model


def compute_embedding(model, text):
    """
    Convert text to a vector embedding.

    The model reads the text and outputs a fixed-size vector (384 numbers)
    that represents the semantic meaning. Similar texts will have similar
    vectors (high cosine similarity).
    """
    # encode() returns a numpy array, convert to list for JSON serialization
    embedding = model.encode(text)
    return embedding.tolist()


# =============================================================================
# MAIN PIPELINE
# =============================================================================

def run_embedding_pipeline():
    """
    Main function: load places, compute embeddings, save results.
    """
    # Step 1: Load the place data
    print(f"\nLoading places from: {INPUT_FILE}")

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}\n"
            "Run fetch_places.py first to collect place data."
        )

    with open(INPUT_FILE) as f:
        data = json.load(f)

    places = data["places"]
    print(f"Loaded {len(places)} places")

    # Step 2: Load the embedding model
    model = load_model()

    # Step 3: Compute embeddings for each place
    print(f"\nComputing embeddings...")

    for i, place in enumerate(places):
        # Prepare the text
        text = prepare_text_for_embedding(place)

        # Compute embedding
        embedding = compute_embedding(model, text)

        # Add to place data
        place["embedding"] = embedding
        place["embedding_text"] = text  # Save for debugging/inspection

        # Progress indicator
        print(f"  [{i+1}/{len(places)}] {place['name']}")

    # Step 4: Save results
    print(f"\nSaving to: {OUTPUT_FILE}")

    output_data = {
        "model": MODEL_NAME,
        "embedding_dimension": len(places[0]["embedding"]) if places else 0,
        "total_places": len(places),
        "places": places,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"Done! Embeddings saved for {len(places)} places.")
    print(f"\nNext step: Run search_places.py to test vibe-based search")

    return places


if __name__ == "__main__":
    run_embedding_pipeline()
