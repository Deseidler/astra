import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerSupabase();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !user.is_anonymous) redirect("/bereich");
  }
  return (
    <main className="access-page">
      <header className="access-header">
        <span className="wordmark">VELMORA</span>
        <span className="access-label">
          <span className="status-dot" /> Persönlicher Zugang
        </span>
      </header>
      <div className="access-layout">
        <section className="brand-stage" aria-label="VELMORA">
          <div className="brand-orbit" aria-hidden="true" />
          <Image
            className="primary-logo"
            src="/brand/velmora-primary.png"
            alt="VELMORA – goldenes Emblem mit roségoldenen Facetten"
            width={1280}
            height={1280}
            sizes="(max-width: 760px) 260px, 480px"
            priority
          />
          <div className="brand-message">
            <span className="eyebrow">Raum für das Wesentliche</span>
            <h1>
              Alles Wichtige.
              <br />
              <em>An einem Ort.</em>
            </h1>
            <p>
              Mehr Überblick. Mehr Ruhe.
              <br />
              Ein persönlicher Bereich, der verbindet.
            </p>
          </div>
        </section>
        <section className="access-card" aria-labelledby="login-heading">
          <span className="card-symbol" aria-hidden="true">
            ⌑
          </span>
          <p className="eyebrow">Willkommen bei VELMORA</p>
          <h2 id="login-heading">Ihr persönlicher Bereich</h2>
          <p className="muted">Melden Sie sich an und kommen Sie an.</p>
          <LoginForm configured={Boolean(supabase)} />
          <div className="access-note">
            <span aria-hidden="true">◇</span>
            <p>
              Ein Zugang, der Ihnen gehört.
              <br />
              <span>Nur für eingeladene Mitglieder.</span>
            </p>
          </div>
        </section>
      </div>
      <footer className="access-footer">
        <span>VELMORA · Mit Raum für Sie.</span>
        <span>Diskret. Persönlich. Verbunden.</span>
      </footer>
    </main>
  );
}
