interface CostBreakdownProps {
  breakdown: {
    food: number;
    hotel: number;
    attraction: number;
    activity: number;
  };
}

const CATEGORY_INFO = {
  food: { icon: '🍽️', label: 'Food & Dining' },
  hotel: { icon: '🏨', label: 'Accommodation' },
  attraction: { icon: '🏛️', label: 'Attractions' },
  activity: { icon: '🎯', label: 'Activities' },
};

export function CostBreakdown({ breakdown }: CostBreakdownProps) {
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return null;
  }

  return (
    <div className="cost-breakdown">
      {(Object.entries(breakdown) as [keyof typeof CATEGORY_INFO, number][])
        .filter(([_, value]) => value > 0)
        .map(([category, value]) => {
          const info = CATEGORY_INFO[category];
          const percentage = total > 0 ? (value / total) * 100 : 0;

          return (
            <div key={category} className="cost-item">
              <div className="cost-item-header">
                <span className="cost-icon">{info.icon}</span>
                <span className="cost-label">{info.label}</span>
                <span className="cost-value">${value.toLocaleString()}</span>
              </div>
              <div className="cost-bar">
                <div
                  className="cost-bar-fill"
                  style={{ width: `${percentage}%` }}
                  data-category={category}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}
