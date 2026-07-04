export default function ScheduleLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="skeleton mb-2 h-8 w-56 rounded-md" />
      <div className="skeleton mb-5 h-4 w-96 max-w-full rounded-md" />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-20 w-full rounded-[var(--radius-md)]" />
        ))}
      </div>
    </div>
  );
}
