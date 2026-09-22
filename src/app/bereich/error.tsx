"use client";
import Link from "next/link";
export default function AreaError({ reset }: { reset: () => void }) {
  return (
    <main className="workspace">
      <section className="panel">
        <h1>Ihr Bereich ist gerade nicht erreichbar.</h1>
        <p>Bitte versuchen Sie es erneut.</p>
        <button className="quiet-button" onClick={reset}>
          Erneut versuchen
        </button>
        <p>
          <Link className="text-link" href="/">
            Zur Anmeldung
          </Link>
        </p>
      </section>
    </main>
  );
}
