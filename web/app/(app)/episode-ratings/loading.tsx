export default function EpisodeRatingsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <div className="skeleton mb-2 h-8 w-56 rounded-md" />
      <div className="skeleton mb-6 h-4 w-96 max-w-full rounded-md" />
      <div className="mx-auto mb-6 max-w-xl">
        <div className="skeleton h-11 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] w-full rounded-[var(--radius-md)]" />
        ))}
      </div>
    </div>
  );
}
