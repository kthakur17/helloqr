// Loaded only when a visitor taps "Save to my HelloQR", so the public card stays free of the Firebase SDK.
import { onAuthStateChanged, type User } from "firebase/auth";
import { getConnection, getMyUsername, saveConnection } from "@/lib/data";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { track } from "@/lib/track";
import type { Connection } from "@/lib/types";

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
  const [myUsername, existing] = await Promise.all([getMyUsername(user.uid), getConnection(user.uid, username)]);
  return { uid: user.uid, myUsername, existing };
}

/** Saves or updates the connection; an event tag from before events were removed is kept as it was. */
export async function saveContact(ctx: SaveContext, username: string, connection: Omit<Connection, "savedAt" | "eventId" | "eventName">) {
  await saveConnection(ctx.uid, username, {
    ...connection,
    eventId: ctx.existing?.eventId ?? "",
    eventName: ctx.existing?.eventName ?? "",
    savedAt: ctx.existing?.savedAt,
  });
  if (!ctx.existing) {
    track(username, "saves");
  }
}
