import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type PdfQuote = {
  quoteNumber: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  quoteLines: { description: string; quantity: number; unit: string; rate: number }[];
  total: number;
  validUntil: string | null;
  terms: string;
  warranty: string;
};

const blue = rgb(0.30, 0.50, 0.74);
const green = rgb(0.00, 0.60, 0.26);
const ink = rgb(0.12, 0.17, 0.14);
const muted = rgb(0.34, 0.38, 0.35);
const rule = rgb(0.52, 0.54, 0.52);
const lightRule = rgb(0.84, 0.85, 0.84);
const pageWidth = 841.89;
const pageHeight = 595.28;
const left = 32;
const right = pageWidth - left;
const contentWidth = right - left;
const money = (amount: number) => `Rs. ${Math.round(amount).toLocaleString("en-LK")}/-`;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function createQuotationPdf(quote: PdfQuote): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Quotation ${quote.quoteNumber} - Nilla Garden`);
  doc.setAuthor("Nilla Garden Service and Landscaping Company");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  let page: PDFPage = doc.addPage([pageWidth, pageHeight]);
  let firstPage = true;
  let y = 0;

  const drawText = (text: string, x: number, top: number, size: number, font = regular, color = ink) => {
    page.drawText(text, { x, y: pageHeight - top - size, size, font, color });
  };
  const centered = (text: string, top: number, size: number, font: PDFFont, color: typeof blue) => {
    drawText(text, (pageWidth - font.widthOfTextAtSize(text, size)) / 2, top, size, font, color);
  };
  const newPage = () => {
    if (!firstPage) page = doc.addPage([pageWidth, pageHeight]);
    firstPage = false;
    const brand = "SAMANTHA ENTERPRISES";
    const brandSize = 57;
    const brandX = (pageWidth - serif.widthOfTextAtSize(brand, brandSize)) / 2;
    drawText(brand, brandX + 1.2, 10.5, brandSize, serif, rgb(0.68, 0.70, 0.72));
    drawText(brand, brandX, 9, brandSize, serif, blue);
    centered("Government & Private Civil Contractor, Gardening Works and Land Reclamation and Filling", 76, 12, serifRegular, blue);
    centered("Provincial Council Reg: W/15616 | CIDA Reg: 17743 | SLIER DC No: RR00094233", 101, 12, serifRegular, blue);
    page.drawLine({ start: { x: left, y: pageHeight - 164 }, end: { x: right, y: pageHeight - 164 }, thickness: 0.8, color: rule });
    y = 183;
  };
  const paragraph = (text: string, size = 9.5, font = regular, color = ink, maxWidth = contentWidth, gap = 4) => {
    const lines = wrap(text, font, size, maxWidth);
    if (y + lines.length * (size + gap) > pageHeight - 42) newPage();
    for (const line of lines) {
      drawText(line, left, y, size, font, color);
      y += size + gap;
    }
  };

  newPage();
  drawText("Nilla Garden Service and Landscaping Company", left, y, 17, bold, green);
  y += 38;
  drawText(`Quotation No: ${quote.quoteNumber}`, left, y, 10, regular, ink);
  y += 31;
  drawText(`Date: ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo" }).format(new Date())}`, left, y, 10, regular, ink);
  y += 34;
  paragraph(`Dear ${quote.customerName}, thank you for considering our company for your gardening needs. Please find your quotation below.`, 10, regular, ink, contentWidth, 4);
  y += 12;

  const col = { description: left + 8, qty: left + 520, rate: left + 630, amountRight: right - 8 };
  const headerHeight = 30;
  const tableHeader = () => {
    page.drawLine({ start: { x: left, y: pageHeight - y - headerHeight }, end: { x: right, y: pageHeight - y - headerHeight }, thickness: 0.8, color: rule });
    drawText("Description", col.description, y + 6, 9.5, bold, ink);
    drawText("Qty", col.qty, y + 6, 9.5, bold, ink);
    drawText("Rate", col.rate, y + 6, 9.5, bold, ink);
    const amountLabel = "Amount";
    drawText(amountLabel, col.amountRight - bold.widthOfTextAtSize(amountLabel, 9.5), y + 6, 9.5, bold, ink);
    y += headerHeight;
  };
  tableHeader();

  for (const line of quote.quoteLines) {
    const descLines = wrap(line.description, regular, 9.5, 490);
    const rowHeight = Math.max(36, descLines.length * 12 + 16);
    if (y + rowHeight > pageHeight - 88) {
      newPage();
      y += 4;
      tableHeader();
    }
    descLines.forEach((lineText, index) => {
      const destAt = lineText.lastIndexOf(" to ");
      if (destAt >= 0) {
        const prefix = lineText.slice(0, destAt + 4);
        const destination = lineText.slice(destAt + 4);
        const prefixWidth = regular.widthOfTextAtSize(prefix, 9.5);
        drawText(prefix, col.description, y + 6 + index * 12, 9.5, regular, ink);
        drawText(destination, col.description + prefixWidth, y + 6 + index * 12, 9.5, regular, blue);
        const linkWidth = regular.widthOfTextAtSize(destination, 9.5);
        page.drawLine({ start: { x: col.description + prefixWidth, y: pageHeight - y - 19 - index * 12 }, end: { x: col.description + prefixWidth + linkWidth, y: pageHeight - y - 19 - index * 12 }, thickness: 0.5, color: blue });
      } else drawText(lineText, col.description, y + 6 + index * 12, 9.5, regular, ink);
    });
    drawText(`${line.quantity.toLocaleString()} ${line.unit}`, col.qty, y + 6, 9.5, regular, ink);
    const rate = `Rs. ${Math.round(line.rate).toLocaleString("en-LK")}`;
    drawText(rate, col.rate, y + 6, 9.5, regular, ink);
    const amount = `Rs. ${Math.round(line.quantity * line.rate).toLocaleString("en-LK")}`;
    drawText(amount, col.amountRight - regular.widthOfTextAtSize(amount, 9.5), y + 6, 9.5, regular, ink);
    y += rowHeight;
    page.drawLine({ start: { x: left, y: pageHeight - y }, end: { x: right, y: pageHeight - y }, thickness: 0.5, color: lightRule });
  }

  y += 16;
  const totalLabel = "Total Amount Payable:";
  const totalValue = money(quote.total);
  const combinedWidth = bold.widthOfTextAtSize(totalLabel, 10.5) + 8 + bold.widthOfTextAtSize(totalValue, 10.5);
  drawText(totalLabel, right - combinedWidth, y, 10.5, bold, ink);
  drawText(totalValue, right - bold.widthOfTextAtSize(totalValue, 10.5), y, 10.5, bold, ink);
  y += 38;
  drawText("Terms and Conditions:", left, y, 9.5, bold, ink);
  y += 19;
  paragraph(quote.terms, 9.5, regular, ink, contentWidth, 3);
  if (quote.warranty) paragraph(quote.warranty, 9.5, regular, ink, contentWidth, 3);
  if (quote.validUntil) paragraph(`Valid until: ${quote.validUntil}`, 9.5, regular, ink, contentWidth, 3);

  page.drawLine({ start: { x: left, y: 23 }, end: { x: right, y: 23 }, thickness: 0.5, color: lightRule });
  return doc.save();
}
