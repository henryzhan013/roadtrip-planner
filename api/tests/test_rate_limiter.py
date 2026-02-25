"""Unit tests for RateLimiter class."""

import time
import pytest
import sys
sys.path.insert(0, '..')

from main import RateLimiter


class TestRateLimiter:
    """Tests for the RateLimiter class."""

    def test_allows_requests_under_limit(self):
        """Should allow requests when under the limit."""
        limiter = RateLimiter(per_minute=5, per_day=100, name="test")

        allowed, reason = limiter.check()

        assert allowed is True
        assert reason == ""

    def test_blocks_requests_over_minute_limit(self):
        """Should block requests when minute limit is exceeded."""
        limiter = RateLimiter(per_minute=2, per_day=100, name="test")

        # Record 2 requests (hits the limit)
        limiter.record()
        limiter.record()

        allowed, reason = limiter.check()

        assert allowed is False
        assert "2/minute" in reason

    def test_blocks_requests_over_day_limit(self):
        """Should block requests when day limit is exceeded."""
        limiter = RateLimiter(per_minute=100, per_day=2, name="test")

        # Record 2 requests (hits daily limit)
        limiter.record()
        limiter.record()

        allowed, reason = limiter.check()

        assert allowed is False
        assert "2/day" in reason

    def test_record_increments_counts(self):
        """Should increment counts when recording requests."""
        limiter = RateLimiter(per_minute=10, per_day=100, name="test")

        assert limiter.status()["minute_used"] == 0
        assert limiter.status()["day_used"] == 0

        limiter.record()

        assert limiter.status()["minute_used"] == 1
        assert limiter.status()["day_used"] == 1

    def test_status_returns_correct_structure(self):
        """Should return status with all required fields."""
        limiter = RateLimiter(per_minute=10, per_day=100, name="test")

        status = limiter.status()

        assert "minute_used" in status
        assert "minute_limit" in status
        assert "day_used" in status
        assert "day_limit" in status
        assert status["minute_limit"] == 10
        assert status["day_limit"] == 100

    def test_name_appears_in_error_message(self):
        """Should include limiter name in error messages."""
        limiter = RateLimiter(per_minute=1, per_day=100, name="TestAPI")
        limiter.record()

        allowed, reason = limiter.check()

        assert "TestAPI" in reason
