import Link from "next/link";
import { RecoveryForm } from "@/components/recovery-form";
export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = Boolean((await searchParams).error);
  return (
    <main className="access-page">
      <header className="access-header">
        <Link href="/" className="wordmark">
          VELMORA
        </Link>
      </header>
      <section className="access-card recovery-card">
        <h1>Passwort vergessen?</h1>
        <p>
          Fordern Sie einen Link für Ihren bestehenden Zugang an. Öffnen Sie die
          E-Mail anschließend in diesem Browser.
        </p>
        {error && (
          <p className="form-message" role="alert">
            Der Wiederherstellungslink ist ungültig, abgelaufen oder wurde in
            einem anderen Browser geöffnet. Bitte fordern Sie hier einen neuen
            Link an.
          </p>
        )}
        <RecoveryForm />
      </section>
    </main>
  );
}
