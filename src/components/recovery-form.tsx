"use client";
import Link from "next/link";
import { useActionState } from "react";
import { changePassword, requestRecovery } from "@/app/recovery-actions";

export function RecoveryForm({ update = false }: { update?: boolean }) {
  const [state, action, pending] = useActionState(
    update ? changePassword : requestRecovery,
    { error: "", notice: "" },
  );
  return (
    <form action={action} className="login-form">
      {update ? (
        <>
          <label htmlFor="new-password">Neues Velmora-Passwort</label>
          <input
            id="new-password"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={pending || Boolean(state.notice)}
          />
          <label htmlFor="confirm-password">Neues Passwort wiederholen</label>
          <input
            id="confirm-password"
            type="password"
            name="confirmation"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={pending || Boolean(state.notice)}
          />
          <p className="muted">
            Mindestens 12 Zeichen. Das ist Ihr Velmora-Passwort; Ihr
            AOL-App-Passwort bleibt unverändert.
          </p>
        </>
      ) : (
        <>
          <label htmlFor="recovery-email">
            E-Mail-Adresse Ihres bestehenden Kontos
          </label>
          <input
            id="recovery-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={pending || Boolean(state.notice)}
          />
        </>
      )}
      {state.error && (
        <p className="form-message" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="form-message" role="status">
          {state.notice}
        </p>
      )}
      {!state.notice && (
        <button className="primary-button" disabled={pending}>
          {pending
            ? "Bitte warten …"
            : update
              ? "Neues Passwort speichern"
              : "Wiederherstellungslink anfordern"}
        </button>
      )}
      <Link href="/" className="text-button">
        Zur Anmeldung
      </Link>
    </form>
  );
}
