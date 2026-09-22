export default function ReelsLoading() {
  return (
    <div className="grid h-[calc(100dvh-var(--app-header-height)-var(--app-bottom-nav-height))] place-items-center bg-black px-4 md:h-[calc(100dvh-var(--app-header-height))]">
      <div className="skeleton h-[min(80dvh,780px)] aspect-[9/16] rounded-[24px]" />
    </div>
  );
}
