"use client";

import { useState } from "react";
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
    <td style="border:1px solid #e5e7eb;padding:14px;vertical-align:top;width:50%;border-radius:8px;">
      <p style="margin:0 0 6px;font-weight:700;color:#1B2C6B;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;letter-spacing:0.02em;">${b.billNumber}</p>
      <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.5;">${b.summary}</p>
    </td>`
    )
    .reduce<string[][]>((rows, cell, i) => {
      if (i % 2 === 0) rows.push([]);
      rows[rows.length - 1].push(cell);
      return rows;
    }, [])
    .map((row) => `<tr>${row.join("")}</tr>`)
    .join("");

  return `<div style="max-width:680px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="text-align:center;padding:20px 0 16px;border-bottom:2px solid #1B2C6B;">
    <p style="margin:0;font-size:16px;font-weight:800;color:#1B2C6B;letter-spacing:0.15em;text-transform:uppercase;">${"Representative Chris Toshiro Todd"}</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;letter-spacing:0.2em;text-transform:uppercase;">Hawaiʻi State Legislature</p>
  </div>
  <h1 style="text-align:center;color:#1B2C6B;font-size:26px;font-weight:800;margin:28px 0 14px;letter-spacing:-0.01em;">${data.headline}</h1>
  <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 24px;text-align:center;">${data.intro}</p>
  <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:24px;">
    ${billCells}
  </table>
  <div style="background:#1B2C6B;text-align:center;padding:16px;border-radius:10px;">
    <p style="margin:0;color:#fff;font-weight:700;font-size:15px;letter-spacing:0.02em;">Questions? Call my office: ${data.ctaPhone}</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:12px;letter-spacing:0.1em;text-transform:uppercase;">${data.session}</p>
</div>`;
}

export default function ExportButtons(props: Props) {
  const [copied, setCopied] = useState(false);
  const hasContent = props.headline && props.intro && props.bills.some(b => b.billNumber && b.summary);

  async function handleDocx() {
    await exportDocx(props);
  }

  async function handlePdf() {
    await exportPdf(props);
  }

  function handleCopyHtml() {
    const html = buildHtml(props);
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const baseBtn =
    "flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100";

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDocx}
        disabled={!hasContent}
        className={`${baseBtn} bg-gradient-to-r from-navy to-blue-800 text-white hover:shadow-md hover:shadow-navy/20`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Word
      </button>
      <button
        onClick={handlePdf}
        disabled={!hasContent}
        className={`${baseBtn} bg-gradient-to-r from-navy to-blue-800 text-white hover:shadow-md hover:shadow-navy/20`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        PDF
      </button>
      <button
        onClick={handleCopyHtml}
        disabled={!hasContent}
        className={`${baseBtn} bg-white border-2 border-navy/20 text-navy hover:border-navy/40 hover:bg-navy/5`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {copied ? "Copied!" : "Copy HTML"}
      </button>
    </div>
  );
}
