// Activity type icons and labels
export const ACTIVITY_ICONS: Record<string, string> = {
  food: '🍽️',
  hotel: '🏨',
  attraction: '📍',
  activity: '🎯',
  drive: '🚗',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  food: 'Food',
  hotel: 'Hotel',
  attraction: 'Attraction',
  activity: 'Activity',
  drive: 'Drive',
};

// Price level displays
export const PRICE_LABELS: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

// Cost estimates per price level (in USD)
export const COST_ESTIMATES = {
  food: { 1: 15, 2: 30, 3: 60, 4: 120 },
  hotel: { 1: 80, 2: 150, 3: 300, 4: 500 },
  attraction: { 1: 10, 2: 25, 3: 50, 4: 100 },
  activity: { 1: 20, 2: 50, 3: 100, 4: 200 },
  drive: { 1: 0, 2: 0, 3: 0, 4: 0 },
};

// Weather condition icons
export const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  clear: '☀️',
  'partly cloudy': '⛅',
  cloudy: '☁️',
  overcast: '☁️',
  rain: '🌧️',
  'light rain': '🌦️',
  'heavy rain': '🌧️',
  thunderstorm: '⛈️',
  snow: '🌨️',
  fog: '🌫️',
  mist: '🌫️',
};

export const getWeatherIcon = (condition: string): string => {
  const lower = condition.toLowerCase();
  for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🌤️';
};
