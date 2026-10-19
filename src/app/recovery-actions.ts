"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { newPassword, recoveryEmail, recoveryOrigin } from "@/lib/recovery";

export type RecoveryState = { error: string; notice: string };
export async function requestRecovery(
  _previous: RecoveryState,
  form: FormData,
): Promise<RecoveryState> {
  const email = recoveryEmail.safeParse(String(form.get("email") || "").trim());
  if (!email.success)
    return {
      error: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      notice: "",
    };
  const origin = recoveryOrigin(
    (await headers()).get("origin"),
    process.env.VERCEL_URL,
    process.env.AUTH_RECOVERY_ORIGIN,
    process.env.NODE_ENV === "development",
  );
  if (!origin)
    return {
      error:
        "Bitte öffnen Sie die Wiederherstellung direkt über Ihre Velmora-Seite.",
      notice: "",
    };
  try {
    const db = await createServerSupabase();
    if (!db)
      return {
        error: "Die Verbindung ist gerade nicht verfügbar.",
        notice: "",
      };
    const { error } = await db.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${origin}/auth/callback`,
    });
    if (error)
      return {
        error:
          "Der Link konnte gerade nicht angefordert werden. Bitte warten Sie etwas und versuchen Sie es erneut.",
        notice: "",
      };
    return {
      error: "",
      notice:
        "Falls zu dieser Adresse ein Konto besteht, wurde ein Wiederherstellungslink angefordert. Öffnen Sie ihn im selben Browser. Prüfen Sie auch den Spam-Ordner.",
    };
  } catch {
    return {
      error: "Die Wiederherstellung ist gerade nicht erreichbar.",
      notice: "",
    };
  }
}

export async function changePassword(
  _previous: RecoveryState,
  form: FormData,
): Promise<RecoveryState> {
  const parsed = newPassword.safeParse({
    password: String(form.get("password") || ""),
    confirmation: String(form.get("confirmation") || ""),
  });
  if (!parsed.success)
    return {
      error:
        "Verwenden Sie mindestens 12 und höchstens 128 Zeichen und geben Sie dasselbe Passwort zweimal ein.",
      notice: "",
    };
  if (
    !recoveryOrigin(
      (await headers()).get("origin"),
      process.env.VERCEL_URL,
      process.env.AUTH_RECOVERY_ORIGIN,
      process.env.NODE_ENV === "development",
    )
  )
    return { error: "Die Anfrage ist nicht erlaubt.", notice: "" };
  try {
    const db = await createServerSupabase();
    if (!db)
      return {
        error: "Die Verbindung ist gerade nicht verfügbar.",
        notice: "",
      };
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();
    if (authError || !user || user.is_anonymous)
      return {
        error:
          "Der Link ist abgelaufen. Bitte fordern Sie einen neuen Wiederherstellungslink an.",
        notice: "",
      };
    const { error } = await db.auth.updateUser({
      password: parsed.data.password,
    });
    if (error)
      return {
        error:
          "Das Passwort konnte nicht geändert werden. Verwenden Sie ein neues, starkes Passwort oder fordern Sie einen frischen Link an.",
        notice: "",
      };
    const { error: signOutError } = await db.auth.signOut({ scope: "global" });
    if (signOutError)
      return {
        error: "",
        notice:
          "Das Passwort wurde geändert. Die Abmeldung anderer Sitzungen konnte nicht bestätigt werden. Bitte melden Sie sich über die Startseite erneut an.",
      };
  } catch {
    return {
      error:
        "Die Änderung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
      notice: "",
    };
  }
  redirect("/?password=updated");
}
