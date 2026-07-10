export default function ShortsLoading() {
  return (
    <div className="grid h-[calc(100dvh-2px)] place-items-center bg-black px-4">
      <div className="skeleton h-[88dvh] w-full max-w-[460px] rounded-[var(--radius-xl)]" />
    </div>
  );
}
