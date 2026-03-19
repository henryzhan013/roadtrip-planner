import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { DayPlan, Place } from '../../types';
import { ActivityCard } from './ActivityCard';
import { WeatherBadge } from '../weather/WeatherBadge';

interface DayCardProps {
  day: DayPlan;
  dayIndex: number;
  favorites: string[];
  estimatedCost?: number;
  onToggleFavorite: (placeId: string, place: Place) => void;
  onRemoveActivity: (dayIndex: number, activityIndex: number) => void;
  onReorderActivities: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  onSelectPlace: (data: { place: Place }) => void;
  onAddStop: (dayIndex: number) => void;
}

export function DayCard({
  day,
  dayIndex,
  favorites,
  estimatedCost,
  onToggleFavorite,
  onRemoveActivity,
  onReorderActivities,
  onSelectPlace,
  onAddStop,
}: DayCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activities = day.activities;
      const oldIndex = activities.findIndex((_, i) => `${dayIndex}-${i}` === String(active.id));
      const newIndex = activities.findIndex((_, i) => `${dayIndex}-${i}` === String(over?.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderActivities(dayIndex, oldIndex, newIndex);
      }
    }
  };

  return (
    <div className="day-card">
      <div className="day-header">
        <div className="day-title">
          <span className="day-number">Day {day.day}</span>
          <span className="day-label">{day.date_label}</span>
        </div>
        <div className="day-meta">
          {day.weather && <WeatherBadge weather={day.weather} compact />}
          {estimatedCost !== undefined && estimatedCost > 0 && (
            <span className="day-cost">~${estimatedCost}</span>
          )}
          <button onClick={() => onAddStop(dayIndex)} className="btn btn-sm">
            + Add Stop
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={day.activities.map((_, idx) => `${dayIndex}-${idx}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="day-activities">
            {day.activities.map((activity, idx) => (
              <ActivityCard
                key={`${dayIndex}-${idx}`}
                activityId={`${dayIndex}-${idx}`}
                activity={activity}
                isFavorite={activity.place ? favorites.includes(activity.place.place_id) : false}
                onToggleFavorite={onToggleFavorite}
                onRemove={() => onRemoveActivity(dayIndex, idx)}
                onSelect={onSelectPlace}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
