import type { Metadata } from "next";
import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Tell us what to build next, what's broken, or what you like about HelloQR.",
};

export default function FeedbackPage() {
  return (
    <div className="wrap grid gap-4 py-12 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col justify-between gap-8 rounded-[1.25rem] bg-ink p-8 text-bg sm:p-10">
        <div>
          <p className="text-xs font-medium tracking-[0.03em] uppercase opacity-60">Feedback</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Help shape HelloQR.</h1>
          <p className="mt-4 opacity-75">
            Ideas, problems, or something you like: every message is read personally. If you&apos;d like a reply, leave your email.
          </p>
        </div>
        <ul className="space-y-2 text-sm opacity-75">
          <li>Found something broken? Mention the page and what you expected.</li>
          <li>Reporting someone&apos;s card? Include its link.</li>
        </ul>
      </div>
      <FeedbackForm />
    </div>
  );
}
