"""Unit tests for SearchCache class."""

import time
import pytest
import sys
sys.path.insert(0, '..')

from main import SearchCache


class TestSearchCache:
    """Tests for the SearchCache class."""

    def test_get_returns_none_for_missing_key(self):
        """Should return None for keys not in cache."""
        cache = SearchCache(ttl_seconds=60)

        result = cache.get("nonexistent query")

        assert result is None

    def test_set_and_get_returns_data(self):
        """Should store and retrieve data correctly."""
        cache = SearchCache(ttl_seconds=60)
        test_data = [{"place_id": "123", "name": "Test Place"}]

        cache.set("coffee austin", test_data)
        result = cache.get("coffee austin")

        assert result == test_data

    def test_get_is_case_insensitive(self):
        """Should treat queries as case-insensitive."""
        cache = SearchCache(ttl_seconds=60)
        test_data = [{"place_id": "123"}]

        cache.set("Coffee Austin", test_data)

        assert cache.get("coffee austin") == test_data
        assert cache.get("COFFEE AUSTIN") == test_data

    def test_get_trims_whitespace(self):
        """Should ignore leading/trailing whitespace."""
        cache = SearchCache(ttl_seconds=60)
        test_data = [{"place_id": "123"}]

        cache.set("coffee austin", test_data)

        assert cache.get("  coffee austin  ") == test_data

    def test_expired_data_returns_none(self):
        """Should return None for expired cache entries."""
        cache = SearchCache(ttl_seconds=1)  # 1 second TTL
        test_data = [{"place_id": "123"}]

        cache.set("coffee austin", test_data)

        # Wait for expiration
        time.sleep(1.1)

        result = cache.get("coffee austin")
        assert result is None

    def test_clear_expired_removes_old_entries(self):
        """Should remove expired entries when clear_expired is called."""
        cache = SearchCache(ttl_seconds=1)

        cache.set("query1", [{"id": 1}])
        time.sleep(1.1)
        cache.set("query2", [{"id": 2}])

        cache.clear_expired()

        # query1 should be gone, query2 should remain
        assert cache.get("query1") is None
        assert cache.get("query2") == [{"id": 2}]

    def test_different_queries_stored_separately(self):
        """Should store different queries independently."""
        cache = SearchCache(ttl_seconds=60)

        cache.set("coffee austin", [{"name": "coffee"}])
        cache.set("bbq austin", [{"name": "bbq"}])

        assert cache.get("coffee austin") == [{"name": "coffee"}]
        assert cache.get("bbq austin") == [{"name": "bbq"}]
