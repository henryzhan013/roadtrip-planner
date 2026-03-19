import type { DayWeather } from '../../types';
import { getWeatherIcon } from '../../utils/constants';

interface WeatherBadgeProps {
  weather: DayWeather;
  compact?: boolean;
}

export function WeatherBadge({ weather, compact = false }: WeatherBadgeProps) {
  const icon = getWeatherIcon(weather.condition);

  if (compact) {
    return (
      <span className="weather-badge weather-badge-compact" title={weather.condition}>
        <span className="weather-icon">{icon}</span>
        <span className="weather-temp">
          {Math.round(weather.temperature_high)}°
        </span>
      </span>
    );
  }

  return (
    <div className="weather-badge">
      <span className="weather-icon">{icon}</span>
      <div className="weather-details">
        <span className="weather-temp">
          {Math.round(weather.temperature_high)}° / {Math.round(weather.temperature_low)}°
        </span>
        <span className="weather-condition">{weather.condition}</span>
        {weather.precipitation_chance > 0 && (
          <span className="weather-precip">💧 {weather.precipitation_chance}%</span>
        )}
      </div>
    </div>
  );
}
