import { redirect } from "next/navigation";
import { MessagesView } from "@/components/messages/messages-view";
import { getCurrentUser } from "@/lib/auth";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentUser()) redirect("/login?next=/messages");
  const { id } = await params;
  return <div className="mx-auto max-w-[1400px] px-3 py-4 md:px-8 md:py-6"><MessagesView initialConversationId={id} /></div>;
}
