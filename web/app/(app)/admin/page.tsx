import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminPanel } from "@/components/admin/admin-panel";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await requireAdmin();
  if (!isAdmin) notFound();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Control room"
          title="Admin"
          description="Manage external provider links, the sites directory, announcements and live availability data."
        />
        <AdminPanel />
      </div>
    </div>
  );
}
