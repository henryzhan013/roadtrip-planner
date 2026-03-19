// Core domain types for Road Trip Planner

export interface Place {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  rating_count?: number;
  category?: string;
  why?: string;
  photo_url?: string;
  price_level?: 1 | 2 | 3 | 4;
}

export type ActivityType = 'drive' | 'food' | 'attraction' | 'activity' | 'hotel';

export interface Activity {
  activity_type: ActivityType;
  time_slot?: string;
  description: string;
  place?: Place;
}

export interface DayWeather {
  date: string;
  location: string;
  temperature_high: number;
  temperature_low: number;
  condition: string;
  precipitation_chance: number;
  icon: string;
}

export interface DayPlan {
  day: number;
  date_label: string;
  activities: Activity[];
  weather?: DayWeather;
  estimatedCost?: number;
}

export interface Trip {
  id: string;
  query: string;
  summary: string;
  days: DayPlan[];
  savedAt: string;
  totalBudget?: number;
  startDate?: string;
}

export interface Budget {
  limit: number;
  spent: number;
  remaining: number;
  breakdown: {
    food: number;
    hotel: number;
    attraction: number;
    activity: number;
  };
}

export interface RouteInfo {
  distance: number;
  duration: number;
  polyline: string;
}

export interface FavoritePlace extends Place {
  created_at?: string;
}

// API Response types
export interface PlanResponse {
  query: string;
  summary: string;
  days: DayPlan[];
  estimated_total_cost?: number;
  cost_breakdown?: Record<string, number>;
}

export interface SearchResponse {
  query: string;
  results: Place[];
}

export interface WeatherRequest {
  locations: Array<{
    lat: number;
    lng: number;
    date: string;
  }>;
}

export interface WeatherResponse {
  forecasts: DayWeather[];
}

export interface BudgetRequest {
  days: DayPlan[];
}

export interface BudgetResponse {
  total_estimated: number;
  by_day: number[];
  by_category: Record<string, number>;
}

// App state types
export type AppMode = 'search' | 'plan';
export type MapView = 'daily' | 'fullTrip';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
