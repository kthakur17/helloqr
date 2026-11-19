import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { owner } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: "Who runs HelloQR, why it exists, and how to get in touch.",
};

export default function AboutPage() {
  return (
    <Prose
      eyebrow="About"
      title="Why HelloQR exists"
      intro={
        <p>
          After every talk or meetup, the same thing happens: a queue of people asking &ldquo;are you on LinkedIn?&rdquo;, spelling out
          usernames over the noise, and half the connections never getting made. HelloQR fixes that with one code.
        </p>
      }
    >
      <section>
        <h2>Who runs it</h2>
        <p>
          HelloQR is built and run by <strong>{owner.name}</strong>, a software engineer and tech community organiser in {owner.city}.
          It isn&apos;t a company and isn&apos;t funded by advertising; it exists because it&apos;s useful.
        </p>
        <ul>
          <li>
            My own card: <Link href={owner.card}>{owner.card.replace("/", "helloqr.vercel.app/")}</Link>
          </li>
          <li>
            LinkedIn: <a href={owner.linkedin}>{owner.linkedin.replace("https://www.", "")}</a>
          </li>
          <li>
            Email: <a href={`mailto:${owner.email}`}>{owner.email}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>How your data is treated</h2>
        <ul>
          <li>Sign-in shares only your name, email and photo. HelloQR can&apos;t read your email, contacts or files.</li>
          <li>Your card shows only what you put on it. Email and phone are optional.</li>
          <li>Cards can&apos;t be browsed or searched; people need your link or your code.</li>
          <li>The people you save, and your notes about them, are visible only to you.</li>
          <li>No ads, no tracking, and your data is never sold.</li>
          <li>You can download everything or delete your account at any time from your dashboard.</li>
        </ul>
        <p>
          The details are in the <Link href="/privacy">privacy policy</Link> and the <Link href="/terms">terms</Link>.
        </p>
      </section>

      <section>
        <h2>Report a problem</h2>
        <p>
          Found a bug, a card impersonating someone, or anything that looks wrong? Email{" "}
          <a href={`mailto:${owner.email}?subject=HelloQR%20report`}>{owner.email}</a> with the link and what you saw. Reports are
          looked at personally.
        </p>
      </section>
    </Prose>
  );
}
