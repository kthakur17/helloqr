import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewBeacon } from "@/components/profile/ProfileActions";
import { ProfileView } from "@/components/profile/ProfileView";
import { SaveToHelloQR } from "@/components/profile/SaveToHelloQR";
import { getPublicProfile } from "@/lib/firebase/server";

// Edits must show the moment the owner saves, so this page is never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username).catch(() => null);
  if (!profile) {
    return { title: "Not found", robots: { index: false } };
  }
  const description = profile.headline || `Connect with ${profile.displayName}.`;
  return {
    title: profile.displayName,
    description,
    alternates: { canonical: `/${username}` },
    openGraph: { title: `${profile.displayName} · HelloQR`, description, type: "profile", url: `/${username}` },
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) {
    notFound();
  }
  return (
    <main className="min-h-dvh px-3 py-6 sm:px-4 sm:py-12">
      <ProfileView profile={profile} username={username}>
        <SaveToHelloQR username={username} displayName={profile.displayName} headline={profile.headline} thumb={profile.thumb} />
      </ProfileView>
      <ViewBeacon username={username} />
    </main>
  );
}
