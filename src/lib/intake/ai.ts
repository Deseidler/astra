import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { HttpError, type workspaceAuth } from "@/lib/workspace/server";
export type IntakeDb = Awaited<ReturnType<typeof workspaceAuth>>["db"];
export const AI_MODEL = "gpt-4.1-mini";
export async function boundedAnalysis<T extends z.ZodType>(db: IntakeDb, key: string, schema: T, instructions: string, input: ResponseInput) : Promise<z.infer<T>> {
  if (!process.env.OPENAI_API_KEY) throw new HttpError(503, "Die KI-Verbindung fehlt. Das Original bleibt gespeichert.");
  const reservation = await db.rpc("reserve_velmora_ai", { p_key: key });
  if (reservation.error) throw new HttpError(503, "Die Kostenbegrenzung ist nicht erreichbar. Die Analyse wurde gestoppt.");
  const slot = reservation.data;
  if (slot.state === "done") return schema.parse(slot.result);
  if (slot.state === "budget") throw new HttpError(429, "Monatslimit von 100 Analysen erreicht. Der Eingang bleibt zur Prüfung erhalten.");
  if (slot.state !== "reserved") throw new HttpError(409, "Dieser Eingang wird bereits geprüft oder benötigt nach einem Fehler eine manuelle Prüfung.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 35000 });
  let inputTokens = 0;
  try {
    const text = { format: zodTextFormat(schema, "velmora_analysis") };
    const counted = await client.responses.inputTokens.count({ model: AI_MODEL, input, instructions, text });
    inputTokens = counted.input_tokens;
    if (!Number.isFinite(inputTokens) || inputTokens > 30000) throw new HttpError(413, "Der Eingang überschreitet die Kostengrenze von 30.000 Eingabetokens. Bitte das Dokument in kleinere Teile aufteilen.");
    const response = await client.responses.parse({ model: AI_MODEL, input, instructions, text, store: false, max_output_tokens: 3000 });
    const result = schema.parse(response.output_parsed);
    const saved = await db.rpc("finish_velmora_ai", { p_id: slot.id, p_status: "done", p_result: result, p_input: response.usage?.input_tokens || inputTokens, p_output: response.usage?.output_tokens || 0 });
    if (saved.error) throw new HttpError(503, "Die Analyse konnte nicht dauerhaft gespeichert werden. Sie wird nicht automatisch wiederholt.");
    return result;
  } catch (e) {
    await db.rpc("finish_velmora_ai", { p_id: slot.id, p_status: "failed", p_result: null, p_input: inputTokens, p_output: 0 });
    if (e instanceof HttpError) throw e;
    throw new HttpError(502, "Die Analyse konnte nicht abgeschlossen werden. Der Eingang bleibt zur manuellen Prüfung erhalten; keine automatische Wiederholung.");
  }
}
