import { notFound } from "next/navigation";
import { getPerson } from "@/lib/person";
import { PersonView } from "@/components/person/person-view";

export const revalidate = 86400;

export default async function PersonPage({ params }: { params: Promise<{ source: string; id: string }> }) {
  const { source, id } = await params;
  const person = await getPerson(source, id);
  if (!person) notFound();

  return <PersonView person={person} />;
}
