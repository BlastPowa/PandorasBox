import { ConversationSettingsView } from "@/components/messages/messages-view";

export default async function ConversationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversationSettingsView id={id} />;
}
