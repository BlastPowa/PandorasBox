import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminPanel } from "@/components/admin/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await requireAdmin();
  if (!isAdmin) notFound();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Shield className="size-6 text-[var(--gold)]" />
        <h1 className="font-display text-2xl font-bold">Admin</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Manage where-to-watch links, the sites directory, announcements, and refresh live availability.
      </p>
      <AdminPanel />
    </div>
  );
}
