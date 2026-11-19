import Link from "next/link";
import { ProfileView } from "@/components/profile/ProfileView";
import type { Profile } from "@/lib/types";

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
    { id: "d", type: "calendly", value: "https://calendly.com/alex-rivera", label: "Book a meeting" },
  ],
  accent: "blue",
  contactEmail: "",
  contactPhone: "",
  createdAt: 0,
  updatedAt: 0,
};

const STEPS = [
  { title: "Create your card", text: "Sign in with Google, claim a short link, and add your photo, title and the profiles that matter." },
  { title: "Print or share your QR", text: "Download a business card, a desk card or just the code. Edit your card any time; the code never changes." },
  { title: "Connect in one scan", text: "People see who you are, save your contact to their phone, and open your profiles straight in their apps." },
];

const FEATURES = [
  ["Save to contacts", "One tap adds your name, title, email, phone, photo and links to their address book."],
  ["Opens the right app", "LinkedIn, X, GitHub and Instagram links open in the installed app, not a login page."],
  ["Print-ready designs", "Business card and A6 desk card in light or dark, plus the bare code as PNG or SVG."],
  ["See what works", "Views, QR scans, contact saves and taps on each link, so you know which profiles people open."],
  ["Private by default", "Cards can't be browsed or searched. Email and phone appear only if you add them."],
  ["People you've met", "Save cards you scan, add a note, and tag where you met. Only you see this list."],
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line-soft">
        <div className="wrap grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <p className="eyebrow">Digital business card</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:text-6xl">
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
            <p className="mt-3 text-center text-xs text-faint">Example card</p>
          </div>
        </div>
      </section>

      <section id="how" className="wrap scroll-mt-16 py-16 sm:py-24">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-ink">Set it up once. Use it at every meeting after.</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-surface p-6">
              <span className="font-mono text-sm text-faint">0{i + 1}</span>
              <h3 className="mt-3 font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, text]) => (
            <div key={title}>
              <h3 className="font-medium text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="events" className="scroll-mt-16 border-y border-line-soft bg-surface">
        <div className="wrap grid gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow">For events</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Everyone in the room, one scan away.</h2>
            <p className="mt-4 leading-relaxed text-muted">
              For conferences, meetups, demo days and offsites. Organisers create an event and show its QR. Attendees join and get a list
              of everyone there, with names, titles and cards, and can save each other in one tap.
            </p>
          </div>
          <dl className="divide-y divide-line-soft border-y border-line-soft">
            {[
              ["Event QR poster", "A print-ready poster for the registration desk or the screen."],
              ["Attendee directory", "Visible only to people who joined. Search by name or title."],
              ["Context on every contact", "Contacts saved at an event remember where you met."],
              ["Organiser export", "Download the attendee list as a spreadsheet; close the event when it ends."],
            ].map(([title, text]) => (
              <div key={title} className="py-4">
                <dt className="font-medium text-ink">{title}</dt>
                <dd className="mt-1 text-sm text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="wrap py-16 text-center sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">Make the next introduction easier.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">Create your card, print your code, and let people take it from there.</p>
        <Link href="/dashboard" className="btn btn-primary mt-8">
          Create your card
        </Link>
      </section>
    </>
  );
}
