export default function TitleLoading() {
  return (
    <div>
      <div className="skeleton h-[240px] w-full sm:h-[340px]" />
      <div className="mx-auto -mt-24 max-w-[1200px] px-4 md:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="skeleton mx-auto aspect-[2/3] w-40 shrink-0 rounded-[var(--radius-lg)] sm:mx-0 sm:w-52" />
          <div className="flex-1 space-y-3 pt-2 sm:pt-24">
            <div className="skeleton h-5 w-32 rounded-full" />
            <div className="skeleton h-9 w-3/4 rounded-md" />
            <div className="skeleton h-4 w-1/2 rounded-md" />
            <div className="skeleton h-11 w-40 rounded-[var(--radius-md)]" />
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="skeleton h-24 w-full rounded-[var(--radius-md)]" />
            <div className="skeleton h-24 w-full rounded-[var(--radius-md)]" />
            <div className="skeleton h-24 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  );
}
