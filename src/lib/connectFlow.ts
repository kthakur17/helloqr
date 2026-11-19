// Loaded only when a visitor taps "Save to my HelloQR", so the public card stays free of the Firebase SDK.
import { onAuthStateChanged, type User } from "firebase/auth";
import { getConnection, getMyUsername, listJoined, saveConnection } from "@/lib/data";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { track } from "@/lib/track";
import type { Connection, JoinedEvent } from "@/lib/types";

export function waitForUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export interface SaveContext {
  uid: string;
  myUsername: string | null;
  joined: (JoinedEvent & { id: string })[];
  existing: Connection | null;
}

export async function loadSaveContext(username: string): Promise<SaveContext | null> {
  if (!isFirebaseConfigured) {
    throw new Error("HelloQR isn't connected to its database yet.");
  }
  const user = await waitForUser();
  if (!user) {
    return null;
  }
  const [myUsername, joined, existing] = await Promise.all([
    getMyUsername(user.uid),
    listJoined(user.uid),
    getConnection(user.uid, username),
  ]);
  return { uid: user.uid, myUsername, joined, existing };
}

/** The event to pre-select: one happening today, else the latest joined in the last three days. */
export function defaultEventId(joined: (JoinedEvent & { id: string })[]): string {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayIso = iso(today);
  const recent = iso(new Date(today.getTime() - 3 * 86_400_000));
  const match = joined.find((e) => e.date === todayIso) ?? joined.find((e) => e.date >= recent && e.date <= todayIso);
  return match?.id ?? "";
}

export async function saveContact(ctx: SaveContext, username: string, connection: Omit<Connection, "savedAt">) {
  await saveConnection(ctx.uid, username, { ...connection, savedAt: ctx.existing?.savedAt });
  if (!ctx.existing) {
    track(username, "saves");
  }
}
