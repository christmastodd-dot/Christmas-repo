"use client";

import { useState } from "react";

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

export default function PostcardPreview({
  headline,
  intro,
  bills,
  ctaPhone,
  session,
}: Props) {
  const [side, setSide] = useState<"content" | "address">("content");

  const displayBills =
    bills.length > 0
      ? bills
      : [
          { billNumber: "HB___", summary: "Bill summary will appear here" },
          { billNumber: "HB___", summary: "Bill summary will appear here" },
        ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="inline-flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setSide("content")}
          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
            side === "content"
              ? "bg-white text-navy shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Content Side
        </button>
        <button
          onClick={() => setSide("address")}
          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
            side === "address"
              ? "bg-white text-navy shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Address Side
        </button>
      </div>

      {/* Postcard — 9:6 landscape */}
      <div className="w-full aspect-[3/2] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {side === "content" ? (
          <div className="h-full flex flex-col">
            {/* Top accent bar */}
            <div className="h-2 bg-gradient-to-r from-navy via-blue-700 to-navy" />

            <div className="flex-1 p-5 md:p-6 flex flex-col">
              {/* Header */}
              <div className="text-center mb-3 pb-3 border-b border-gray-100">
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-navy">
                  Representative Chris Toshiro Todd
                </p>
                <p className="text-[9px] text-gray-400 tracking-widest uppercase mt-0.5">
                  Hawaiʻi State Legislature
                </p>
              </div>

              {/* Headline */}
              <h2 className="text-center font-extrabold text-base md:text-lg lg:text-xl text-navy mb-2 leading-tight">
                {headline || "Your Headline Here"}
              </h2>

              {/* Intro */}
              <p className="text-[10px] md:text-[11px] text-gray-600 mb-4 leading-relaxed text-center max-w-[90%] mx-auto">
                {intro || "Your intro paragraph will appear here\u2026"}
              </p>

              {/* Bill grid */}
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                {displayBills.map((bill, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-2.5 flex flex-col"
                  >
                    <p className="font-bold text-[10px] text-navy mb-1 tracking-wide">
                      {bill.billNumber}
                    </p>
                    <p className="text-[8px] md:text-[9px] text-gray-600 leading-snug flex-1">
                      {bill.summary}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA bar */}
              <div className="mt-3 bg-navy rounded-lg py-2 text-center">
                <p className="text-white text-[10px] font-semibold tracking-wide">
                  Questions? Call my office: {ctaPhone || "808-586-8480"}
                </p>
              </div>

              {/* Session line */}
              {(session || true) && (
                <p className="text-center text-[8px] text-gray-400 mt-1.5 tracking-wider uppercase">
                  {session || "Session / Date"}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Address side */
          <div className="h-full flex flex-col">
            {/* Aloha banner */}
            <div className="bg-gradient-to-r from-navy via-blue-800 to-navy py-6 text-center">
              <p className="text-white text-3xl font-extrabold tracking-widest">
                ALOHA!
              </p>
              <div className="mt-2 w-12 h-0.5 bg-white/40 mx-auto rounded-full" />
            </div>

            <div className="flex-1 flex items-center justify-between px-8 py-6">
              {/* Return address */}
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-navy text-sm mb-1">
                  Rep. Chris Toshiro Todd
                </p>
                <p className="text-gray-600">Hawaiʻi State Legislature</p>
                <p className="text-gray-600">415 S. Beretania St., Rm 443</p>
                <p className="text-gray-600">Honolulu, HI 96813</p>
              </div>

              {/* Recipient area */}
              <div className="text-right space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg w-16 h-12 flex items-center justify-center ml-auto">
                  <span className="text-[7px] text-gray-400 uppercase tracking-wider">
                    Stamp
                  </span>
                </div>
                <div className="space-y-2.5 mt-4">
                  <div className="w-40 h-px bg-gray-300" />
                  <div className="w-40 h-px bg-gray-300" />
                  <div className="w-32 h-px bg-gray-300 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
