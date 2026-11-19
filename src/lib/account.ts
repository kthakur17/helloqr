import {
  deleteUser,
  GithubAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { collection, doc, getDocs, writeBatch, type DocumentReference } from "firebase/firestore";
import { getCounters, listConnections, listJoined, listMyEvents } from "@/lib/data";
import { db } from "@/lib/firebase/client";
import type { Profile } from "@/lib/types";

/** Everything HelloQR holds about the signed-in person, as one JSON-ready object. */
export async function exportAccount(user: User, username: string, profile: Profile) {
  const [counters, connections, joined, organised] = await Promise.all([
    getCounters(username),
    listConnections(user.uid),
    listJoined(user.uid),
    listMyEvents(user.uid),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: {
      uid: user.uid,
      email: user.email,
      signInName: user.displayName,
      signInProviders: user.providerData.map((p) => p.providerId),
      createdAt: user.metadata.creationTime,
    },
    username,
    card: profile,
    cardStats: counters,
    connections,
    eventsJoined: joined,
    eventsOrganised: organised,
  };
}

/** Deleting the sign-in needs a fresh login, so ask for it before touching any data. */
export async function confirmIdentity(user: User) {
  const providerId = user.providerData[0]?.providerId;
  const provider = providerId === "github.com" ? new GithubAuthProvider() : new GoogleAuthProvider();
  await reauthenticateWithPopup(user, provider);
}

/** Commits deletes in chunks under Firestore's 500-writes-per-batch limit. */
async function deleteAll(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db());
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/**
 * Removes the account in an order the security rules accept: things that need the profile to
 * check ownership go first; the profile, user record and username retirement go together last.
 */
export async function deleteAccount(user: User, username: string, onStep: (step: string) => void) {
  const store = db();
  const uid = user.uid;

  onStep("Leaving events");
  const joined = await listJoined(uid);
  await deleteAll(joined.flatMap((e) => [doc(store, "events", e.id, "attendees", uid), doc(store, "users", uid, "joined", e.id)]));

  onStep("Removing saved connections");
  const connections = await getDocs(collection(store, "users", uid, "connections"));
  await deleteAll(connections.docs.map((d) => d.ref));

  onStep("Removing events you organised");
  for (const event of await listMyEvents(uid)) {
    const attendees = await getDocs(collection(store, "events", event.id, "attendees"));
    await deleteAll(attendees.docs.map((d) => d.ref));
    await deleteAll([doc(store, "events", event.id)]);
  }

  onStep("Removing your card");
  const counters = await getDocs(collection(store, "profiles", username, "counters"));
  await deleteAll(counters.docs.map((d) => d.ref));
  const batch = writeBatch(store);
  batch.set(doc(store, "retired", username), { retiredAt: Date.now() });
  batch.delete(doc(store, "profiles", username));
  batch.delete(doc(store, "users", uid));
  await batch.commit();

  onStep("Removing your sign-in");
  await deleteUser(user);

  try {
    window.localStorage.removeItem(`hq:print:${username}`);
  } catch {
    // Nothing to clean up in private mode.
  }
}
