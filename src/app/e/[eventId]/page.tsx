import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { EventView } from "@/components/events/EventView";
import { Logo } from "@/components/Logo";
import { formatDate } from "@/lib/cards";
import { getPublicEvent } from "@/lib/firebase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/e/[eventId]">): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getPublicEvent(eventId).catch(() => null);
  if (!event) {
    return { title: "Event not found", robots: { index: false } };
  }
  return {
    title: event.name,
    description: `Join ${event.name} on HelloQR (${formatDate(event.date)}${event.venue ? `, ${event.venue}` : ""}) and swap profiles with everyone there.`,
    robots: { index: false },
  };
}

export default async function EventPage({ params }: PageProps<"/e/[eventId]">) {
  const { eventId } = await params;
  const event = await getPublicEvent(eventId);
  if (!event) {
    notFound();
  }
  return (
    <div className="min-h-dvh">
      <header className="wrap flex h-16 items-center">
        <Logo />
      </header>
      <main className="wrap pb-16">
        <AuthProvider>
          <EventView eventId={eventId} initialEvent={event} />
        </AuthProvider>
      </main>
    </div>
  );
}
