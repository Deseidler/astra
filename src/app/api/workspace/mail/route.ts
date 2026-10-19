import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  checkOrigin,
  HttpError,
  workspaceAuth,
} from "@/lib/workspace/server";
import { listInbox, readMessage } from "@/lib/mail/aol";
import { analyzeMail } from "@/lib/mail/analyze";
import { canAccessMailbox, mailRefSchema } from "@/lib/mail/model";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const { user } = await workspaceAuth();
    const query = new URL(request.url).searchParams;
    if (query.get("status") === "1") {
      const allowed = canAccessMailbox(user.id, process.env.AOL_OWNER_ID);
      return NextResponse.json(
        {
          configured:
            allowed &&
            Boolean(process.env.AOL_EMAIL && process.env.AOL_APP_PASSWORD),
          ai: allowed && Boolean(process.env.OPENAI_API_KEY),
        },
        { headers },
      );
    }
    if (query.has("uid")) {
      const ref = mailRefSchema.parse({
        uid: Number(query.get("uid")),
        validity: query.get("validity"),
      });
      return NextResponse.json(
        { message: await readMessage(user.id, ref) },
        { headers },
      );
    }
    const before = query.has("before")
      ? z
          .number()
          .int()
          .min(1)
          .max(4294967295)
          .parse(Number(query.get("before")))
      : undefined;
    return NextResponse.json(await listInbox(user.id, before), { headers });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await workspaceAuth();
    const text = await request.text();
    if (text.length > 1000)
      throw new HttpError(413, "Die Anfrage ist zu groß.");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Ungültige Anfrage.");
    }
    const input = mailRefSchema
      .extend({ consent: z.literal(true) })
      .parse(json);
    // Re-read from the authenticated mailbox; never trust client-supplied message text.
    const message = await readMessage(user.id, input);
    return NextResponse.json(
      { analysis: await analyzeMail(message) },
      { headers },
    );
  } catch (e) {
    return apiError(e);
  }
}
