# HelloQR

One printable QR code for every profile you have. People scan it, see who you are, and tap straight into
your LinkedIn, GitHub, X and the rest. The links are the official `https://` profile addresses, so phones
open them in the installed app.

A digital business card for professionals and founders, with an event mode for conferences, meetups and demo days.

## Features

- **Card page** at `/<username>`: photo, headline, roles and affiliations, bio, up to 20 links, *Save contact*
  (a vCard with photo and links) and *Share*. Server-rendered and free of the Firebase SDK, so it loads
  fast on venue Wi-Fi.
- **Dashboard**: profile editor with live preview, drag/arrow reordering, and stats for views, QR scans,
  contact downloads, saves and taps per link.
- **QR & print**: business card (3.5 × 2 in), A6 desk card and plain QR (PNG or SVG), in Light or Dark,
  with an optional photo in the middle of the code. The code points to `/<username>?s=qr`,
  so editing the card never needs a reprint.
- **Event mode**: an organiser creates an event and downloads its QR poster. Attendees join and see a
  searchable list of everyone there, and can save each other in one tap. Saved connections remember where
  you met. Organisers can export the attendee list as CSV, remove people, and close the event.
- **Connections**: private list of people you saved, filterable by event, with notes and CSV export.

## Design

The visual language (warm canvas, rounded white tiles, uniform gaps, Plus Jakarta Sans with Inter) is
adapted from the **Bento Grid** guide in [chrislemke/website_designs](https://github.com/chrislemke/website_designs)
(MIT License, © its author). The dark theme and the card layouts are HelloQR's own.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Plus Jakarta Sans + Inter · Firebase Auth (Google, optional
GitHub) · Cloud Firestore · `qrcode` · brand icons from simple-icons (CC0).

Photos are stored as small JPEG data URLs inside the profile document, so the project runs on Firebase's
free Spark plan (new Cloud Storage buckets require the paid Blaze plan).

## Set up Firebase

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable **Google**. GitHub is optional; it needs a GitHub OAuth app,
   and you then set `NEXT_PUBLIC_ENABLE_GITHUB_SIGNIN=true`.
3. **Authentication → Settings → Authorised domains**: add your Vercel domain (localhost is there already).
4. **Firestore Database**: create it in production mode, in a region near your users (e.g. `asia-south1`).
5. **Project settings → Your apps → Web app**: register an app and copy its config into `.env.local`
   (start from `.env.example`).
6. Deploy the security rules and the one composite index:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add          # pick the project
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```
   You can also paste `firestore.rules` into the console's Rules tab, and create the index
   (`events`: `organiserUid` ascending, `date` descending) when the console prompts for it.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests: link parsing and XSS guards, usernames, vCard, CSV
npm run lint
npm run build
```

After changing the icon list in `scripts/gen-icons.mjs`, run `node scripts/gen-icons.mjs`.

## Deploy (Vercel)

Add the same `NEXT_PUBLIC_FIREBASE_*` variables in the Vercel project settings, deploy, then add the
production domain to Firebase's authorised domains.

## Data model and privacy

| Path | Who can read | Notes |
|---|---|---|
| `profiles/{username}` | anyone with the username | cannot be listed or browsed |
| `profiles/{username}/counters/{key}` | owner | anyone may add exactly +1 |
| `users/{uid}` | owner | username is permanent |
| `users/{uid}/connections/*`, `users/{uid}/joined/*` | owner | |
| `events/{id}` | anyone with the link | organiser edits; events are closed, never deleted |
| `events/{id}/attendees/*` | that event's attendees and organiser | |

`firestore.rules` is the security boundary; the client checks only give friendly error messages.
Stored link values are re-validated before they are rendered, so a `javascript:` URL written straight to
Firestore never becomes a link.

## Known limits

- **The security rules have only been checked signed-out** (8 probes against the live project) plus
  the owner's own sign-in and card claim. Multi-user flows (joining an event, saving someone) still need
  a two-account test. The emulator needs Java, which isn't installed on the dev machine.
- Counters can be inflated by anyone who calls the endpoint repeatedly. They are for interest, not
  billing. Firebase App Check would harden them.
- The username can't be changed after it's claimed, because printed QR codes point at it.
- Attendee and connection entries keep a snapshot of the name, headline and thumbnail from when they were
  saved. The card link always shows the live profile.
