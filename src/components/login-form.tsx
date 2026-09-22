"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/app/auth-actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  const [visible, setVisible] = useState(false);
  return (
    <form action={action} className="login-form">
      <label htmlFor="email">E-Mail-Adresse</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="name@beispiel.de"
        required
        maxLength={254}
        disabled={pending || !configured}
      />
      <label htmlFor="password">Passwort</label>
      <div className="password-field">
        <input
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Ihr Passwort"
          required
          maxLength={1024}
          disabled={pending || !configured}
        />
        <button
          type="button"
          className="reveal-password"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
          aria-pressed={visible}
        >
          {visible ? "Verbergen" : "Anzeigen"}
        </button>
      </div>
      {state.error && (
        <p className="form-message" role="alert">
          {state.error}
        </p>
      )}
      {!configured && (
        <p className="form-message" role="status">
          Ihr Zugang wird gerade eingerichtet.
        </p>
      )}
      <button
        className="primary-button"
        type="submit"
        disabled={pending || !configured}
      >
        {pending ? "Anmeldung läuft …" : "Anmelden"}
        <span aria-hidden="true">→</span>
      </button>
      <details className="login-help">
        <summary>Hilfe beim Zugang</summary>
        <p>
          Nutzen Sie die Zugangsdaten Ihres bestehenden Kontos. Wenn Ihnen der
          Zugang fehlt oder Sie Ihr Passwort vergessen haben, wenden Sie sich
          bitte an die Person, die Ihren Zugang verwaltet.
        </p>
      </details>
    </form>
  );
}
