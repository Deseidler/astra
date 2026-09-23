import type { Item } from "./model";
export const money = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export function documentLabel(item: Item) {
  return `${item.data.date || "Datum-offen"}_${String(item.document_number || "").padStart(4, "0")}_${item.title.replace(/\.(pdf|png|jpe?g)$/i, "")}`;
}
export function financialTotals(items: Item[]) {
  return items
    .filter((i) => ["document", "task"].includes(i.kind))
    .reduce(
      (total, item) => {
        const value = Number(item.data.amountCents) || 0;
        total[
          item.kind === "task"
            ? item.data.done
              ? "paid"
              : "open"
            : item.data.settled
              ? "paid"
              : "open"
        ] += value;
        return total;
      },
      { open: 0, paid: 0 },
    );
}
export function searchItems(items: Item[], query: string) {
  const normalize = (s: string) =>
    s
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const stop = new Set([
    "zeig",
    "zeige",
    "mir",
    "bitte",
    "die",
    "der",
    "das",
    "den",
    "dem",
    "von",
    "fur",
    "ich",
    "suche",
    "finde",
    "such",
    "nach",
    "alle",
    "letzte",
    "letzten",
    "eine",
    "einen",
    "ein",
    "und",
    "ist",
    "wo",
  ]);
  const words = normalize(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !stop.has(w));
  if (!words.length) return [];
  return items
    .filter((item) => {
      const member = items.find((p) => p.id === item.data.profileId);
      const hay = normalize(
        [
          item.title,
          item.data.category,
          item.data.notes,
          item.data.reference,
          member?.title,
        ].join(" "),
      );
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) =>
      String(b.data.date || b.created_at).localeCompare(
        String(a.data.date || a.created_at),
      ),
    )
    .slice(0, 8);
}
