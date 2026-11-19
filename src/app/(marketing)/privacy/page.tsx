import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { legal, owner } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What HelloQR stores, who can see it, and how to download or delete it.",
};

export default function PrivacyPage() {
  return (
    <Prose
      eyebrow="Privacy policy"
      title="What we store, who sees it, and how to delete it"
      intro={<p>Effective {legal.effective}. Written in plain language; if anything is unclear, email us.</p>}
    >
      <section>
        <h2>Who we are</h2>
        <p>
          HelloQR is run by {owner.name}, an individual based in {owner.city}. For anything about your data, email{" "}
          <a href={`mailto:${owner.email}`}>{owner.email}</a>.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>From Google (or GitHub) sign-in:</strong> your name, email address, profile photo and an account ID. We never see
            your password, and HelloQR has no access to your email, contacts, calendar or files.
          </li>
          <li>
            <strong>What you put on your card:</strong> name, headline, roles, bio, photo, links, and, only if you add them, an email
            address and phone number. <strong>Your card is public</strong> to anyone who has your link or scans your QR code.
          </li>
          <li>
            <strong>Card stats:</strong> counts of views, QR scans, contact downloads, saves and link taps. These are only numbers; we
            don&apos;t record who viewed your card.
          </li>
          <li>
            <strong>People you save:</strong> their name, headline and small photo as shown on their card, where you met, and your
            note. Only you can see this list.
          </li>
          <li>
            <strong>Details you share with a card owner:</strong> if you use &ldquo;Share your details&rdquo; on someone&apos;s card,
            the name, contact details, company, LinkedIn and note you enter are sent to that person only. You don&apos;t need an
            account to do this. To have them removed, ask that person, or email us with the card link.
          </li>
          <li>
            <strong>Events:</strong> an event&apos;s name, date, venue and description are visible to anyone with the event link. Its
            attendee list (name, headline, small photo and HelloQR link) is visible only to people who joined and to the organiser,
            who can export it.
          </li>
          <li>
            <strong>Technical data:</strong> our hosting providers process IP addresses and request logs to run the service and keep
            it secure; to stop spam, the &ldquo;Share your details&rdquo; form briefly keeps a count of submissions per IP address in
            memory, which is never stored. Your browser stores your QR-page settings, a short-lived note so one visit isn&apos;t
            counted twice, and a copy of your own QR details so &ldquo;Show my QR&rdquo; works without a connection.
          </li>
        </ul>
        <p>
          We don&apos;t use advertising, tracking cookies or third-party analytics, and we don&apos;t build profiles of what you do.
        </p>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          Only to run HelloQR: showing your card, letting people save your contact, showing your stats, and running events. We{" "}
          <strong>do not sell</strong> your data, show ads, or share it with anyone except the providers below that host the service.
        </p>
      </section>

      <section>
        <h2>Where it&apos;s stored</h2>
        <p>
          Accounts and data are stored with Google Firebase (Firebase Authentication and Cloud Firestore), and the website is hosted on
          Vercel. These providers may process data outside India, under their own security and privacy commitments.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Until you change it or delete your account. Deleting your account removes your data from our live database straight away;
          copies in our providers&apos; logs or backups are cleared on their normal schedules.
        </p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <ul>
          <li>Edit or remove anything on your card at any time from your dashboard.</li>
          <li>
            Download everything we hold about you: <Link href="/dashboard/account">Dashboard → Account → Download my data</Link>.
          </li>
          <li>
            Delete your account and data: <Link href="/dashboard/account">Dashboard → Account → Delete account</Link>. Your username is
            then retired and never given to anyone else, so old printed codes can&apos;t point to someone new.
          </li>
          <li>
            Under India&apos;s Digital Personal Data Protection Act, 2023 (and similar laws where you live) you can ask us to access,
            correct or erase your data, or raise a concern. Email <a href={`mailto:${owner.email}`}>{owner.email}</a> and we&apos;ll
            reply within 30 days.
          </li>
        </ul>
        <p>
          If someone saved your card before you deleted your account, their private copy (your name, headline and small photo) stays
          in their list until they remove it, much like a contact saved on their phone.
        </p>
      </section>

      <section>
        <h2>Age</h2>
        <p>HelloQR is for people aged {legal.minimumAge} and over. Please don&apos;t create an account if you are younger.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy we&apos;ll update the date above, and for significant changes we&apos;ll say so on the site before
          they take effect.
        </p>
      </section>
    </Prose>
  );
}
