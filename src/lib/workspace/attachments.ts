import { PDFDocument } from "pdf-lib";
export async function appendAttachments(
  letter: Uint8Array,
  attachments: { bytes: Uint8Array; mime: string }[],
) {
  if (attachments.reduce((total, a) => total + a.bytes.byteLength, 0) > 3145728)
    throw new Error("Die Anhänge dürfen zusammen höchstens 3 MB groß sein.");
  const target = await PDFDocument.load(letter);
  for (const attachment of attachments) {
    if (attachment.mime === "application/pdf") {
      const source = await PDFDocument.load(attachment.bytes);
      if (source.getPageCount() > 50)
        throw new Error("Ein Anhang darf höchstens 50 Seiten haben.");
      for (const page of await target.copyPages(
        source,
        source.getPageIndices(),
      ))
        target.addPage(page);
    } else {
      const image =
        attachment.mime === "image/png"
          ? await target.embedPng(attachment.bytes)
          : await target.embedJpg(attachment.bytes);
      const page = target.addPage([595.28, 841.89]);
      const scale = Math.min(495 / image.width, 741 / image.height, 1);
      const width = image.width * scale,
        height = image.height * scale;
      page.drawImage(image, {
        x: (595.28 - width) / 2,
        y: (841.89 - height) / 2,
        width,
        height,
      });
    }
  }
  const result = await target.save();
  if (result.byteLength > 4 * 1024 * 1024)
    throw new Error(
      "Die fertige PDF ist zu groß. Bitte weniger Anhänge auswählen.",
    );
  return result;
}
