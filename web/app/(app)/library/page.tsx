import { LibraryView } from "@/components/library/library-view";

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <h1 className="mb-5 font-display text-2xl font-bold">My Library</h1>
      <LibraryView />
    </div>
  );
}
