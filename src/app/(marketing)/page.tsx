import Link from "next/link";
import { BrandChip } from "@/components/BrandIcon";
import { ProfileView } from "@/components/profile/ProfileView";
import type { LinkType, Profile } from "@/lib/types";

// A fictional example for the hero, not a real person's profile.
const SAMPLE: Profile = {
  uid: "sample",
  displayName: "Alex Rivera",
  headline: "Founder & CEO, Northwind",
  bio: "",
  photo: "",
  thumb: "",
  roles: ["Founder · Northwind", "Angel investor"],
  links: [
    { id: "a", type: "linkedin", value: "alex-rivera", label: "" },
    { id: "b", type: "x", value: "alexrivera", label: "" },
    { id: "c", type: "website", value: "https://northwind.example", label: "Company" },
  ],
  accent: "blue",
  contactEmail: "",
  contactPhone: "",
  createdAt: 0,
  updatedAt: 0,
};

const NETWORKS: LinkType[] = ["linkedin", "x", "github", "instagram", "youtube", "medium", "calendly", "whatsapp"];

function Icon({ d }: { d: string }) {
  return (
    <span className="grid size-12 place-items-center rounded-[0.875rem] bg-surface-2 text-ink">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="wrap grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <p className="eyebrow">Digital business card</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-balance text-ink sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
            One QR code for every way to reach you.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Share your LinkedIn, X, website and contact details in a single scan. No spelling out usernames, no business cards that go
            out of date.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-primary">
              Create your card
            </Link>
            <Link href="#how" className="btn btn-ghost">
              How it works
            </Link>
          </div>
          <p className="mt-4 text-sm text-faint">Free. Takes about two minutes.</p>
        </div>
        <div>
          <div className="pointer-events-none select-none" aria-hidden="true">
            <ProfileView profile={SAMPLE} username="alex" preview />
          </div>
          <p className="mt-2 text-center text-xs text-faint">Example card</p>
        </div>
      </section>

      <section id="how" className="wrap scroll-mt-16 pb-16 sm:pb-24">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold text-ink sm:text-4xl">Set it up once. Use it at every meeting after.</h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel flex flex-col justify-between gap-8 p-7 sm:col-span-2 lg:row-span-2">
            <div>
              <span className="font-display text-sm font-bold text-muted">01 · Create</span>
              <h3 className="mt-3 text-2xl font-bold text-ink">One card with every profile that matters</h3>
              <p className="mt-2 text-muted">Sign in with Google, claim a short link, and add your photo, title and links. Paste a URL or just a username.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {NETWORKS.map((type) => (
                <BrandChip key={type} type={type} tone="brand" />
              ))}
            </div>
          </div>

          <div className="panel flex flex-col justify-between gap-6 p-7 sm:col-span-2">
            <div>
              <span className="font-display text-sm font-bold text-muted">02 · Share</span>
              <h3 className="mt-3 text-xl font-bold text-ink">Print it, or show it on your phone</h3>
              <p className="mt-2 text-sm text-muted">Business card, desk card or a full-screen code that works offline. The code never changes.</p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-[1.25rem] bg-kombu p-7 text-white sm:col-span-2">
            <div>
              <span className="font-display text-sm font-bold text-white/60">03 · Connect</span>
              <h3 className="mt-3 text-xl font-bold">They scan, save you and open your profiles in their apps</h3>
              <p className="mt-2 text-sm text-white/70">LinkedIn opens in LinkedIn, not a login page. One tap adds you to their contacts.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-7 lg:col-span-2">
            <Icon d="M4 12h12m0 0-4-4m4 4-4 4M20 5v14" />
            <h3 className="mt-5 text-lg font-bold text-ink">Contact exchange</h3>
            <p className="mt-1.5 text-sm text-muted">
              People without HelloQR can send you their name, email and LinkedIn straight from your card. It lands in your
              connections.
            </p>
          </div>
          <div className="panel flex flex-col justify-between p-7">
            <span className="font-display text-5xl font-extrabold tracking-[-0.03em] text-ink">0</span>
            <div>
              <h3 className="mt-4 text-lg font-bold text-ink">Reprints</h3>
              <p className="mt-1.5 text-sm text-muted">Edit your card any time. Printed codes keep working.</p>
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-matcha/40 p-7">
            <Icon d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" />
            <h3 className="mt-5 text-lg font-bold text-ink">Private by default</h3>
            <p className="mt-1.5 text-sm text-text">Cards can&apos;t be browsed or searched. Email and phone only if you add them.</p>
          </div>
          <div className="panel p-7">
            <Icon d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
            <h3 className="mt-5 text-lg font-bold text-ink">See what works</h3>
            <p className="mt-1.5 text-sm text-muted">Views, scans, contact saves and taps on each link.</p>
          </div>
          <div className="panel p-7">
            <Icon d="M7 3h10v18l-5-3-5 3z" />
            <h3 className="mt-5 text-lg font-bold text-ink">People you&apos;ve met</h3>
            <p className="mt-1.5 text-sm text-muted">Save cards you scan, add a note and remember where you met.</p>
          </div>
          <div className="rounded-[1.25rem] bg-tamago/35 p-7 sm:col-span-2">
            <Icon d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" />
            <h3 className="mt-5 text-lg font-bold text-ink">Link previews that look like you</h3>
            <p className="mt-1.5 text-sm text-text">Paste your link into WhatsApp, LinkedIn or Slack and it shows your photo, name and title.</p>
          </div>
        </div>
      </section>

      <section id="events" className="wrap scroll-mt-16 pb-16 sm:pb-24">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col justify-between gap-10 rounded-[1.25rem] bg-ink p-8 text-bg lg:col-span-2 sm:p-10">
            <div>
              <p className="text-xs font-medium tracking-[0.03em] uppercase opacity-60">For events</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold sm:text-4xl">Everyone in the room, one scan away.</h2>
              <p className="mt-4 max-w-xl opacity-75">
                For conferences, meetups, demo days and offsites. Organisers show one QR; attendees join and see everyone there, with names,
                titles and cards, and save each other in one tap.
              </p>
            </div>
            <Link href="/dashboard/events" className="btn w-fit bg-bg text-ink hover:opacity-90">
              Create an event
            </Link>
          </div>
          <div className="grid gap-4">
            {[
              ["Event QR poster", "Print-ready for the registration desk or the screen."],
              ["Attendee directory", "Visible only to people who joined."],
              ["Context on every contact", "Saved contacts remember where you met."],
            ].map(([title, text]) => (
              <div key={title} className="panel p-6">
                <h3 className="font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap pb-20 sm:pb-28">
        <div className="panel px-6 py-14 text-center sm:py-20">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">Make the next introduction easier.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">Create your card, print your code, and let people take it from there.</p>
          <Link href="/dashboard" className="btn btn-primary mt-8">
            Create your card
          </Link>
        </div>
      </section>
    </>
  );
}
