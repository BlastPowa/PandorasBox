import { redirect } from "next/navigation";
import { MessagesView } from "@/components/messages/messages-view";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Messages · PBox" };

export default async function MessagesPage() {
  if (!await getCurrentUser()) redirect("/login?next=/messages");
  return <div className="mx-auto max-w-[1400px] px-3 py-4 md:px-8 md:py-6"><MessagesView /></div>;
}
