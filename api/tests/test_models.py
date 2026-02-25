"""Unit tests for Pydantic models."""

import pytest
import sys
sys.path.insert(0, '..')

from main import PlaceSummary, Activity, DayPlan, PlanResponse


class TestPlaceSummary:
    """Tests for PlaceSummary model."""

    def test_required_fields(self):
        """Should require place_id, name, address, lat, lng."""
        place = PlaceSummary(
            place_id="abc123",
            name="Test Place",
            address="123 Main St",
            lat=30.27,
            lng=-97.74
        )

        assert place.place_id == "abc123"
        assert place.name == "Test Place"
        assert place.lat == 30.27

    def test_optional_fields_default_to_none(self):
        """Should default optional fields correctly."""
        place = PlaceSummary(
            place_id="abc123",
            name="Test Place",
            address="123 Main St",
            lat=30.27,
            lng=-97.74
        )

        assert place.rating is None
        assert place.rating_count == 0
        assert place.category == ""
        assert place.why is None
        assert place.photo_url is None
        assert place.price_level is None

    def test_all_fields(self):
        """Should accept all fields."""
        place = PlaceSummary(
            place_id="abc123",
            name="Test Place",
            address="123 Main St",
            lat=30.27,
            lng=-97.74,
            rating=4.5,
            rating_count=100,
            category="restaurant",
            why="Great food",
            photo_url="https://example.com/photo.jpg",
            price_level=2
        )

        assert place.rating == 4.5
        assert place.price_level == 2


class TestActivity:
    """Tests for Activity model."""

    def test_activity_without_place(self):
        """Should allow activity without a place (e.g., drive)."""
        activity = Activity(
            activity_type="drive",
            description="Drive to Austin"
        )

        assert activity.activity_type == "drive"
        assert activity.place is None

    def test_activity_with_place(self):
        """Should accept activity with a place."""
        place = PlaceSummary(
            place_id="abc",
            name="Restaurant",
            address="123 St",
            lat=30.0,
            lng=-97.0
        )

        activity = Activity(
            activity_type="food",
            description="Lunch",
            place=place
        )

        assert activity.place.name == "Restaurant"


class TestDayPlan:
    """Tests for DayPlan model."""

    def test_day_plan_structure(self):
        """Should create day plan with activities."""
        day = DayPlan(
            day=1,
            date_label="Beach Day",
            activities=[
                Activity(activity_type="drive", description="Drive to beach"),
                Activity(activity_type="activity", description="Beach time")
            ]
        )

        assert day.day == 1
        assert day.date_label == "Beach Day"
        assert len(day.activities) == 2


class TestPlanResponse:
    """Tests for PlanResponse model."""

    def test_plan_response_structure(self):
        """Should create complete plan response."""
        response = PlanResponse(
            query="weekend trip",
            summary="A fun weekend",
            days=[
                DayPlan(
                    day=1,
                    date_label="Day 1",
                    activities=[]
                )
            ]
        )

        assert response.query == "weekend trip"
        assert response.summary == "A fun weekend"
        assert len(response.days) == 1
