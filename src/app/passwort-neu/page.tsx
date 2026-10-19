import Link from "next/link";
import { redirect } from "next/navigation";
import { RecoveryForm } from "@/components/recovery-form";
import { createServerSupabase } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function NewPassword() {
  const db = await createServerSupabase();
  if (!db) redirect("/passwort-vergessen?error=link");
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user || user.is_anonymous)
    redirect("/passwort-vergessen?error=link");
  return (
    <main className="access-page">
      <header className="access-header">
        <Link href="/" className="wordmark">
          VELMORA
        </Link>
      </header>
      <section className="access-card recovery-card">
        <h1>Neues Passwort festlegen</h1>
        <p>
          Wählen Sie Ihr neues Passwort selbst. Nach dem Speichern melden Sie
          sich damit erneut an.
        </p>
        <RecoveryForm update />
      </section>
    </main>
  );
}
