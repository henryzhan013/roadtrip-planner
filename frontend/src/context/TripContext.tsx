import { createContext, useContext, useReducer, ReactNode } from 'react';
import type { DayPlan, Place, Activity, Budget, RouteInfo, AppMode, MapView } from '../types';

interface TripState {
  query: string;
  tripDays: DayPlan[];
  tripSummary: string;
  loading: boolean;
  error: string | null;
  mode: AppMode;
  selectedPlace: { place: Place; day?: number; activity_type?: string } | null;
  routeInfo: RouteInfo | null;
  mapView: MapView;
  budget: Budget | null;
  editMode: boolean;
  editingTripId: string | null;
  originalTrip: DayPlan[] | null;
}

type TripAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_TRIP'; payload: { days: DayPlan[]; summary: string } }
  | { type: 'SET_TRIP_DAYS'; payload: DayPlan[] }
  | { type: 'SET_SELECTED_PLACE'; payload: TripState['selectedPlace'] }
  | { type: 'SET_ROUTE_INFO'; payload: RouteInfo | null }
  | { type: 'SET_MAP_VIEW'; payload: MapView }
  | { type: 'SET_BUDGET'; payload: Budget | null }
  | { type: 'ADD_ACTIVITY'; payload: { dayIndex: number; activity: Activity } }
  | { type: 'REMOVE_ACTIVITY'; payload: { dayIndex: number; activityIndex: number } }
  | { type: 'REORDER_ACTIVITIES'; payload: { dayIndex: number; fromIndex: number; toIndex: number } }
  | { type: 'ENTER_EDIT_MODE'; payload: { tripId: string } }
  | { type: 'EXIT_EDIT_MODE' }
  | { type: 'CANCEL_EDIT' }
  | { type: 'CLEAR_TRIP' };

const initialState: TripState = {
  query: '',
  tripDays: [],
  tripSummary: '',
  loading: false,
  error: null,
  mode: 'search',
  selectedPlace: null,
  routeInfo: null,
  mapView: 'daily',
  budget: null,
  editMode: false,
  editingTripId: null,
  originalTrip: null,
};

function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_TRIP':
      return {
        ...state,
        tripDays: action.payload.days,
        tripSummary: action.payload.summary,
        mode: 'plan',
        loading: false,
        error: null,
      };

    case 'SET_TRIP_DAYS':
      return { ...state, tripDays: action.payload };

    case 'SET_SELECTED_PLACE':
      return { ...state, selectedPlace: action.payload };

    case 'SET_ROUTE_INFO':
      return { ...state, routeInfo: action.payload };

    case 'SET_MAP_VIEW':
      return { ...state, mapView: action.payload };

    case 'SET_BUDGET':
      return { ...state, budget: action.payload };

    case 'ADD_ACTIVITY': {
      const newDays = [...state.tripDays];
      const { dayIndex, activity } = action.payload;
      if (dayIndex >= 0 && dayIndex < newDays.length) {
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          activities: [...newDays[dayIndex].activities, activity],
        };
      }
      return { ...state, tripDays: newDays };
    }

    case 'REMOVE_ACTIVITY': {
      const newDays = [...state.tripDays];
      const { dayIndex, activityIndex } = action.payload;
      if (dayIndex >= 0 && dayIndex < newDays.length) {
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          activities: newDays[dayIndex].activities.filter((_, i) => i !== activityIndex),
        };
      }
      return { ...state, tripDays: newDays };
    }

    case 'REORDER_ACTIVITIES': {
      const newDays = [...state.tripDays];
      const { dayIndex, fromIndex, toIndex } = action.payload;
      if (dayIndex >= 0 && dayIndex < newDays.length) {
        const activities = [...newDays[dayIndex].activities];
        const [removed] = activities.splice(fromIndex, 1);
        activities.splice(toIndex, 0, removed);
        newDays[dayIndex] = { ...newDays[dayIndex], activities };
      }
      return { ...state, tripDays: newDays };
    }

    case 'ENTER_EDIT_MODE':
      return {
        ...state,
        editMode: true,
        editingTripId: action.payload.tripId,
        originalTrip: JSON.parse(JSON.stringify(state.tripDays)),
      };

    case 'EXIT_EDIT_MODE':
      return {
        ...state,
        editMode: false,
        editingTripId: null,
        originalTrip: null,
      };

    case 'CANCEL_EDIT':
      return {
        ...state,
        tripDays: state.originalTrip || state.tripDays,
        editMode: false,
        editingTripId: null,
        originalTrip: null,
      };

    case 'CLEAR_TRIP':
      return {
        ...state,
        tripDays: [],
        tripSummary: '',
        selectedPlace: null,
        routeInfo: null,
        budget: null,
        editMode: false,
        editingTripId: null,
        originalTrip: null,
      };

    default:
      return state;
  }
}

interface TripContextType {
  state: TripState;
  dispatch: React.Dispatch<TripAction>;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tripReducer, initialState);

  return (
    <TripContext.Provider value={{ state, dispatch }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripContext() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return context;
}

export type { TripState, TripAction };
