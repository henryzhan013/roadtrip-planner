import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { useTripContext } from '../context/TripContext';
import type { DayPlan, Budget, BudgetResponse } from '../types';
import { COST_ESTIMATES } from '../utils/constants';

export function useBudget() {
  const { state, dispatch } = useTripContext();
  const [loading, setLoading] = useState(false);

  // Calculate budget locally (fallback if API unavailable)
  const calculateLocally = useCallback((days: DayPlan[]): Budget => {
    const breakdown = {
      food: 0,
      hotel: 0,
      attraction: 0,
      activity: 0,
    };

    days.forEach(day => {
      day.activities.forEach(activity => {
        const priceLevel = activity.place?.price_level || 2;
        const type = activity.activity_type as keyof typeof COST_ESTIMATES;

        if (type in COST_ESTIMATES && type in breakdown) {
          const costs = COST_ESTIMATES[type];
          breakdown[type as keyof typeof breakdown] += costs[priceLevel as 1 | 2 | 3 | 4] || 0;
        }
      });
    });

    const spent = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return {
      limit: state.budget?.limit || 0,
      spent,
      remaining: Math.max(0, (state.budget?.limit || 0) - spent),
      breakdown,
    };
  }, [state.budget?.limit]);

  // Calculate budget using API
  const calculateBudget = useCallback(
    async (days: DayPlan[]): Promise<Budget> => {
      setLoading(true);

      try {
        const response = await api.post<BudgetResponse>('/calculate-budget', { days });

        const budget: Budget = {
          limit: state.budget?.limit || 0,
          spent: response.total_estimated,
          remaining: Math.max(0, (state.budget?.limit || 0) - response.total_estimated),
          breakdown: {
            food: response.by_category.food || 0,
            hotel: response.by_category.hotel || 0,
            attraction: response.by_category.attraction || 0,
            activity: response.by_category.activity || 0,
          },
        };

        dispatch({ type: 'SET_BUDGET', payload: budget });
        setLoading(false);
        return budget;
      } catch {
        // Fallback to local calculation
        const budget = calculateLocally(days);
        dispatch({ type: 'SET_BUDGET', payload: budget });
        setLoading(false);
        return budget;
      }
    },
    [state.budget?.limit, dispatch, calculateLocally]
  );

  const setBudgetLimit = useCallback(
    (limit: number) => {
      const budget: Budget = {
        ...(state.budget || {
          spent: 0,
          remaining: limit,
          breakdown: { food: 0, hotel: 0, attraction: 0, activity: 0 },
        }),
        limit,
        remaining: Math.max(0, limit - (state.budget?.spent || 0)),
      };
      dispatch({ type: 'SET_BUDGET', payload: budget });
    },
    [state.budget, dispatch]
  );

  const getCostForDay = useCallback(
    (day: DayPlan): number => {
      let total = 0;
      day.activities.forEach(activity => {
        const priceLevel = activity.place?.price_level || 2;
        const type = activity.activity_type as keyof typeof COST_ESTIMATES;

        if (type in COST_ESTIMATES) {
          const costs = COST_ESTIMATES[type];
          total += costs[priceLevel as 1 | 2 | 3 | 4] || 0;
        }
      });
      return total;
    },
    []
  );

  return {
    budget: state.budget,
    loading,
    calculateBudget,
    setBudgetLimit,
    getCostForDay,
  };
}
