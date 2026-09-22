import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Letter } from "./model";
const gold = rgb(0.698, 0.541, 0.263),
  ink = rgb(0.1, 0.1, 0.1);
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (
        font.widthOfTextAtSize((line ? line + " " : "") + word, size) <= width
      ) {
        line += (line ? " " : "") + word;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
export async function renderLetter(title: string, letter: Letter) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold),
    serif = await doc.embedFont(StandardFonts.TimesRoman);
  for (const value of [
    title,
    ...Object.values(letter).filter((v) => typeof v === "string"),
  ])
    regular.encodeText(String(value).replace(/[\r\n\t]/g, " "));
  const width = 595.28,
    height = 841.89,
    left = 70.87,
    right = 538.58;
  let page = doc.addPage([width, height]);
  let y = 535;
  const initials = letter.sender
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .join("")
    .toUpperCase();
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.65,
      color: gold,
    });
  function header() {
    const cx = width / 2,
      cy = 798;
    line(cx, cy + 19, cx + 16, cy);
    line(cx + 16, cy, cx, cy - 19);
    line(cx, cy - 19, cx - 16, cy);
    line(cx - 16, cy, cx, cy + 19);
    page.drawText(initials, {
      x: cx - serif.widthOfTextAtSize(initials, 14) / 2,
      y: cy - 5,
      size: 14,
      font: serif,
      color: gold,
    });
    line(left, 784, cx - 32, 784);
    line(cx + 32, 784, right, 784);
    const name = letter.sender.toUpperCase();
    const size = Math.min(20, 460 / serif.widthOfTextAtSize(name, 1));
    page.drawText(name, {
      x: (width - serif.widthOfTextAtSize(name, size)) / 2,
      y: 752,
      size,
      font: serif,
      color: ink,
    });
    const address = letter.senderAddress.replace(/\n/g, " · ");
    const aSize = Math.min(8.5, 460 / regular.widthOfTextAtSize(address, 1));
    page.drawText(address, {
      x: (width - regular.widthOfTextAtSize(address, aSize)) / 2,
      y: 730,
      size: aSize,
      font: regular,
      color: ink,
    });
    if (letter.status !== "approved")
      page.drawText("ENTWURF · Nicht freigegeben", {
        x: left,
        y: 708,
        size: 8,
        font: regular,
        color: gold,
      });
  }
  function nextPage() {
    page = doc.addPage([width, height]);
    header();
    y = 680;
  }
  function block(value: string, font = regular, size = 10.5, gap = 15) {
    for (const text of wrapText(value, font, size, right - left)) {
      if (y < 72) nextPage();
      page.drawText(text, { x: left, y, size, font, color: ink });
      y -= gap;
    }
  }
  header();
  const senderLine =
    letter.sender + " · " + letter.senderAddress.replace(/\n/g, ", ");
  page.drawText(senderLine, {
    x: 56.69,
    y: 695,
    size: Math.min(7, 245 / regular.widthOfTextAtSize(senderLine, 1)),
    font: regular,
    color: ink,
  });
  const recipientLines = wrapText(letter.recipient, regular, 10, 240);
  if (recipientLines.length > 6)
    throw new Error(
      "Die Empfängeranschrift ist zu lang für das Adressfenster.",
    );
  recipientLines.forEach((text, i) =>
    page.drawText(text, {
      x: 56.69,
      y: 674 - i * 14,
      size: 10,
      font: regular,
      color: ink,
    }),
  );
  const dateText =
    (letter.place ? letter.place + ", " : "") +
    letter.date.split("-").reverse().join(".");
  page.drawText(dateText, {
    x: right - regular.widthOfTextAtSize(dateText, 10),
    y: 575,
    size: 10,
    font: regular,
    color: ink,
  });
  for (const top of [105, 210])
    line(8, height - (top * 72) / 25.4, 20, height - (top * 72) / 25.4);
  block(title, bold, 11.5, 16);
  if (letter.reference)
    block("Aktenzeichen: " + letter.reference, bold, 10, 15);
  y -= 15;
  block(letter.salutation);
  y -= 12;
  block(letter.body);
  y -= 18;
  block(letter.closing);
  y -= 26;
  block(letter.sender);
  if (letter.attachments) {
    y -= 20;
    block("Anlagen", bold);
    block(letter.attachments, regular, 9.5, 14);
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: left, y: 43 },
      end: { x: right, y: 43 },
      thickness: 0.7,
      color: gold,
    });
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: right - 25,
      y: 29,
      size: 8,
      font: regular,
      color: ink,
    });
  });
  doc.setTitle(title);
  doc.setAuthor(letter.sender);
  doc.setCreator("VELMORA");
  doc.setLanguage("de-DE");
  return doc.save({ useObjectStreams: false });
}
export function emailDraft(
  to: string,
  subject: string,
  body: string,
  pdf?: Uint8Array,
) {
  if (/[\r\n]/.test(to) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
    throw new Error("Ungültige Empfängeradresse.");
  const b64 = (value: string | Uint8Array) =>
    Buffer.from(value)
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") || "";
  const header = `To: ${to}\r\nSubject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=\r\nMIME-Version: 1.0\r\nX-Unsent: 1\r\n`;
  if (!pdf)
    return (
      header +
      `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(body)}\r\n`
    );
  const boundary = "velmora_attachment_boundary";
  return (
    header +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(body)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="Schreiben.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(pdf)}\r\n--${boundary}--\r\n`
  );
}
