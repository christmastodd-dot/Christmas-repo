import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface BillData {
  billNumber: string;
  summary: string;
}

interface PostcardData {
  headline: string;
  intro: string;
  bills: BillData[];
  ctaPhone: string;
  session: string;
}

const NAVY = rgb(27 / 255, 44 / 255, 107 / 255);
const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0, 0, 0);

function wrapText(text: string, font: ReturnType<typeof StandardFonts.TimesRoman extends string ? never : never> | Awaited<ReturnType<PDFDocument['embedFont']>>, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function exportPdf(data: PostcardData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([792, 612]); // letter landscape (11x8.5)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Header
  const headerText = "Representative Chris Toshiro Todd";
  const headerWidth = helveticaBold.widthOfTextAtSize(headerText, 18);
  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y,
    size: 18,
    font: helveticaBold,
    color: NAVY,
  });
  y -= 22;

  const subText = "Hawaiʻi State Legislature";
  const subWidth = helvetica.widthOfTextAtSize(subText, 12);
  page.drawText(subText, {
    x: (width - subWidth) / 2,
    y,
    size: 12,
    font: helvetica,
    color: NAVY,
  });
  y -= 18;

  const addrText = "415 S. Beretania St., Rm 443, Honolulu, HI 96813";
  const addrWidth = helvetica.widthOfTextAtSize(addrText, 9);
  page.drawText(addrText, {
    x: (width - addrWidth) / 2,
    y,
    size: 9,
    font: helvetica,
    color: GRAY,
  });
  y -= 40;

  // Headline
  const headlineWidth = helveticaBold.widthOfTextAtSize(data.headline, 22);
  page.drawText(data.headline, {
    x: (width - headlineWidth) / 2,
    y,
    size: 22,
    font: helveticaBold,
    color: NAVY,
  });
  y -= 35;

  // Intro
  const introLines = wrapText(data.intro, helvetica, 11, width - margin * 2);
  for (const line of introLines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font: helvetica,
      color: BLACK,
    });
    y -= 16;
  }
  y -= 15;

  // Bill grid — 2 columns
  const colWidth = (width - margin * 2 - 30) / 2;
  const billStartY = y;

  data.bills.forEach((bill, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colWidth + 30);
    const baseY = billStartY - row * 90;

    // Bill number
    page.drawText(bill.billNumber, {
      x,
      y: baseY,
      size: 12,
      font: helveticaBold,
      color: NAVY,
    });

    // Summary wrapped
    const summaryLines = wrapText(bill.summary, helvetica, 10, colWidth);
    summaryLines.forEach((line, li) => {
      page.drawText(line, {
        x,
        y: baseY - 16 - li * 14,
        size: 10,
        font: helvetica,
        color: BLACK,
      });
    });
  });

  const billRows = Math.ceil(data.bills.length / 2);
  y = billStartY - billRows * 90 - 20;

  // CTA
  const ctaText = `Questions? Call my office: ${data.ctaPhone}`;
  const ctaWidth = helveticaBold.widthOfTextAtSize(ctaText, 13);
  page.drawText(ctaText, {
    x: (width - ctaWidth) / 2,
    y,
    size: 13,
    font: helveticaBold,
    color: NAVY,
  });
  y -= 22;

  // Session
  const sessWidth = helvetica.widthOfTextAtSize(data.session, 9);
  page.drawText(data.session, {
    x: (width - sessWidth) / 2,
    y,
    size: 9,
    font: helvetica,
    color: GRAY,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "postcard.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
