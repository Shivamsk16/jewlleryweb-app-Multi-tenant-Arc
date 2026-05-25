export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-surfaceElevated rounded animate-pulse w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-lg space-y-3 animate-pulse">
      <div className="h-4 bg-surfaceElevated rounded w-3/4" />
      <div className="h-4 bg-surfaceElevated rounded w-1/2" />
      <div className="h-4 bg-surfaceElevated rounded w-2/3" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 border border-border rounded-xl animate-pulse space-y-2">
      <div className="h-4 bg-surfaceElevated rounded w-1/3" />
      <div className="h-8 bg-surfaceElevated rounded w-1/2" />
    </div>
  );
}
