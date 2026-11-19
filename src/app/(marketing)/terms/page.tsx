import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { legal, owner } from "@/content/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using HelloQR.",
};

export default function TermsPage() {
  return (
    <Prose eyebrow="Terms of use" title="The rules for using HelloQR" intro={<p>Effective {legal.effective}.</p>}>
      <section>
        <h2>The service</h2>
        <p>
          HelloQR lets you publish a digital business card at a short link with a QR code, save people you meet, and run events where
          attendees can see each other. It is free and run by {owner.name}. By creating an account you agree to these terms and to
          the <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must be {legal.minimumAge} or older.</li>
          <li>Sign in with your own Google or GitHub account and keep it secure.</li>
          <li>One card per account. Usernames are permanent so that printed codes keep working.</li>
        </ul>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You own what you put on your card, and you&apos;re responsible for it. You let us store and display it so HelloQR can work.
          Please don&apos;t:
        </p>
        <ul>
          <li>pretend to be another person or organisation, or claim a username to impersonate them;</li>
          <li>post anything illegal, hateful, sexually explicit, harassing or misleading;</li>
          <li>link to malware, scams or phishing pages;</li>
          <li>use HelloQR to spam people, or scrape cards or attendee lists in bulk.</li>
        </ul>
        <p>
          We may remove content, retire a username or close an account that breaks these rules. Where it&apos;s reasonable we&apos;ll
          tell you why first.
        </p>
      </section>

      <section>
        <h2>Events</h2>
        <p>
          Organisers are responsible for their events. If you export an attendee list, use it only to follow up about that event and
          respect attendees&apos; privacy: don&apos;t add them to mailing lists without their consent or share the list with others.
        </p>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          HelloQR is provided as it is, free of charge. We work to keep it running and your data safe, but we can&apos;t promise it
          will always be available or error-free. We may change features, and if we ever shut the service down we&apos;ll give at
          least 30 days&apos; notice on the site so you can download your data. Because printed codes depend on the service, keep that
          in mind for large print runs.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          To the extent the law allows, we aren&apos;t liable for indirect losses or for anything other people do with information you
          chose to make public on your card. Nothing in these terms limits rights you have that can&apos;t be excluded by law.
        </p>
      </section>

      <section>
        <h2>Law and contact</h2>
        <p>
          These terms are governed by the laws of India, and the courts of Indore, Madhya Pradesh have jurisdiction. Questions or
          reports: <a href={`mailto:${owner.email}`}>{owner.email}</a>.
        </p>
      </section>
    </Prose>
  );
}
