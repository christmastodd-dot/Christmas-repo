import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
} from "docx";
import { saveAs } from "file-saver";

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

const NAVY = "1B2C6B";

export async function exportDocx(data: PostcardData) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // letter
          },
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Representative Chris Toshiro Todd",
                bold: true,
                size: 32,
                color: NAVY,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Hawaiʻi State Legislature",
                size: 22,
                color: NAVY,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "415 S. Beretania St., Rm 443, Honolulu, HI 96813",
                size: 18,
                color: "666666",
                font: "Arial",
              }),
            ],
          }),
          // Headline
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: data.headline,
                bold: true,
                size: 36,
                color: NAVY,
                font: "Arial",
              }),
            ],
          }),
          // Intro
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: data.intro,
                size: 22,
                font: "Arial",
              }),
            ],
          }),
          // Bill grid (2 columns)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: buildBillRows(data.bills),
          }),
          // CTA
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `Questions? Call my office: ${data.ctaPhone}`,
                bold: true,
                size: 24,
                color: NAVY,
                font: "Arial",
              }),
            ],
          }),
          // Session
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [
              new TextRun({
                text: data.session,
                size: 18,
                italics: true,
                color: "666666",
                font: "Arial",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "postcard.docx");
}

function buildBillRows(bills: BillData[]): TableRow[] {
  const rows: TableRow[] = [];
  for (let i = 0; i < bills.length; i += 2) {
    const cells: TableCell[] = [];
    for (let j = i; j < i + 2; j++) {
      const bill = bills[j];
      cells.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
          },
          children: bill
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: bill.billNumber,
                      bold: true,
                      size: 22,
                      color: NAVY,
                      font: "Arial",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: bill.summary,
                      size: 20,
                      font: "Arial",
                    }),
                  ],
                }),
              ]
            : [new Paragraph({ children: [] })],
        })
      );
    }
    rows.push(new TableRow({ children: cells }));
  }
  return rows;
}
