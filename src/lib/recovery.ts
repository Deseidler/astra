import { z } from "zod";

export const recoveryEmail = z.email().max(254);
export const newPassword = z
  .object({
    password: z.string().min(12).max(128),
    confirmation: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "Die Passwörter stimmen nicht überein.",
  });

export function recoveryOrigin(
  origin: string | null,
  deploymentHost?: string,
  extraOrigin?: string,
  development = false,
) {
  const allowed = new Set([
    "https://velmora-mauve.vercel.app",
    "https://velmora-git-codex-aol-correspondence-dominik-seidler.vercel.app",
    ...(deploymentHost ? [`https://${deploymentHost}`] : []),
    ...(extraOrigin ? [extraOrigin] : []),
    ...(development ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
  ]);
  return origin && allowed.has(origin) ? origin : null;
}
