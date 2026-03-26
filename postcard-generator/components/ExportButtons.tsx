"use client";

import { exportDocx } from "@/lib/exportDocx";
import { exportPdf } from "@/lib/exportPdf";

interface BillData {
  billNumber: string;
  summary: string;
}

interface Props {
  headline: string;
  intro: string;
  bills: BillData[];
  ctaPhone: string;
  session: string;
}

function buildHtml(data: Props): string {
  const billCells = data.bills
    .map(
      (b) => `
    <td style="border:1px solid #ddd;padding:12px;vertical-align:top;width:50%;">
      <p style="margin:0 0 4px;font-weight:bold;color:#1B2C6B;font-family:Arial,sans-serif;font-size:14px;">${b.billNumber}</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#333;line-height:1.4;">${b.summary}</p>
    </td>`
    )
    .reduce<string[][]>((rows, cell, i) => {
      if (i % 2 === 0) rows.push([]);
      rows[rows.length - 1].push(cell);
      return rows;
    }, [])
    .map((row) => `<tr>${row.join("")}</tr>`)
    .join("");

  return `<div style="max-width:680px;margin:0 auto;font-family:Arial,sans-serif;">
  <div style="text-align:center;padding:16px 0;">
    <p style="margin:0;font-size:18px;font-weight:bold;color:#1B2C6B;">Representative Chris Toshiro Todd</p>
    <p style="margin:4px 0 0;font-size:13px;color:#1B2C6B;">Hawaiʻi State Legislature</p>
    <p style="margin:4px 0 0;font-size:11px;color:#666;">415 S. Beretania St., Rm 443, Honolulu, HI 96813</p>
  </div>
  <h1 style="text-align:center;color:#1B2C6B;font-size:24px;margin:24px 0 12px;">${data.headline}</h1>
  <p style="font-size:15px;line-height:1.5;color:#333;margin:0 0 20px;">${data.intro}</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    ${billCells}
  </table>
  <div style="background:#1B2C6B;text-align:center;padding:14px;border-radius:6px;">
    <p style="margin:0;color:#fff;font-weight:bold;font-size:15px;">Questions? Call my office: ${data.ctaPhone}</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#999;margin-top:8px;font-style:italic;">${data.session}</p>
</div>`;
}

export default function ExportButtons(props: Props) {
  const hasContent = props.headline && props.intro && props.bills.length > 0;

  async function handleDocx() {
    await exportDocx(props);
  }

  async function handlePdf() {
    await exportPdf(props);
  }

  function handleCopyHtml() {
    const html = buildHtml(props);
    navigator.clipboard.writeText(html);
    alert("HTML copied to clipboard!");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDocx}
        disabled={!hasContent}
        className="px-4 py-2 bg-navy text-white text-sm font-medium rounded hover:bg-blue-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Download Word
      </button>
      <button
        onClick={handlePdf}
        disabled={!hasContent}
        className="px-4 py-2 bg-navy text-white text-sm font-medium rounded hover:bg-blue-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Download PDF
      </button>
      <button
        onClick={handleCopyHtml}
        disabled={!hasContent}
        className="px-4 py-2 border-2 border-navy text-navy text-sm font-medium rounded hover:bg-navy hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Copy HTML
      </button>
    </div>
  );
}
