interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export function Skeleton({ className = '', width, height, borderRadius }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton className="skeleton-image" height={180} />
      <div className="skeleton-content">
        <Skeleton height={24} width="70%" borderRadius="4px" />
        <Skeleton height={16} width="50%" borderRadius="4px" />
        <Skeleton height={48} borderRadius="4px" />
        <Skeleton height={40} width={120} borderRadius="8px" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton width={48} height={48} borderRadius="8px" />
          <div className="skeleton-list-content">
            <Skeleton height={18} width="60%" borderRadius="4px" />
            <Skeleton height={14} width="40%" borderRadius="4px" />
          </div>
        </div>
      ))}
    </div>
  );
}
