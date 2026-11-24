import Link from 'next/link';
export const metadata = { title: 'Privacy: GLT Academic Unit' };
export default function Privacy() {
  return (
    <main className="prose-sm mx-auto max-w-lg space-y-4 px-5 py-8">
      <Link href="/" className="muted inline-flex min-h-[44px] items-center text-sm underline">← Back</Link>
      <h1 className="text-3xl">What we store and why</h1>
      <p className="muted">We keep as little as we can, in line with the Nigeria Data Protection Act.</p>
      <h2 className="text-xl">What we keep</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Your email and name.</b> So you can sign in and we know who you are.</li>
        <li><b>Faculty, department and level.</b> So we show you events that apply to you.</li>
        <li><b>WhatsApp number (optional).</b> Shown to other members only if you choose to be listed in People.</li>
        <li><b>Your sign-ups, timetable and reminder choices.</b> Only you can see these. Tutors see names and attendance for their own sessions only.</li>
        <li><b>Weekly goals (optional).</b> Private to you. Nobody else can read them.</li>
        <li><b>Help requests.</b> Only the care liaison and the unit admins can read them. They are never shown in lists to other people and are never sent by email. Messages that mention hurting yourself are marked urgent so leadership can follow up the same day.</li>
        <li><b>Phone notification details,</b> if you turn on notifications, so we can send reminders.</li>
      </ul>
      <h2 className="text-xl">What we do not keep</h2>
      <p>No grades or CGPA. No exam questions. No payment details. Reports show counts only, never names.</p>
      <h2 className="text-xl">Your choices</h2>
      <p>You can unlist yourself, turn off goals and reminders, or delete your account and everything linked to it from <b>My account</b>. Deleting is permanent.</p>
      <p className="muted text-sm">Questions? Ask a unit admin.</p>
    </main>
  );
}
