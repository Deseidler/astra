"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export type LoginState = { error: string };

export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 1024) {
    return {
      error: "Bitte geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.",
    };
  }
  const supabase = await createServerSupabase();
  if (!supabase)
    return {
      error:
        "Der Zugang wird eingerichtet. Bitte versuchen Sie es später erneut.",
    };
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return {
        error:
          "Die Anmeldung war nicht möglich. Bitte prüfen Sie Ihre Zugangsdaten und versuchen Sie es erneut.",
      };
  } catch {
    return {
      error:
        "Der Zugang ist gerade nicht erreichbar. Bitte versuchen Sie es erneut.",
    };
  }
  redirect("/bereich");
}

export async function signOut() {
  const supabase = await createServerSupabase();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error)
      throw new Error(
        "Abmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
      );
  }
  redirect("/");
}
