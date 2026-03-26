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

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSide("content")}
          className={`text-sm px-3 py-1 rounded ${
            side === "content"
              ? "bg-navy text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Content Side
        </button>
        <button
          onClick={() => setSide("address")}
          className={`text-sm px-3 py-1 rounded ${
            side === "address"
              ? "bg-navy text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Address Side
        </button>
      </div>

      {/* 9:6 landscape aspect ratio */}
      <div className="w-full aspect-[3/2] bg-white border-2 border-gray-300 rounded-lg shadow-inner overflow-hidden">
        {side === "content" ? (
          <div className="h-full p-6 flex flex-col">
            {/* Header */}
            <div className="text-center mb-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Representative Chris Toshiro Todd
              </p>
              <p className="text-[8px] text-gray-400">
                Hawaiʻi State Legislature
              </p>
            </div>

            {/* Headline */}
            <h2
              className="text-center font-bold text-sm md:text-base lg:text-lg mb-2"
              style={{ color: "#1B2C6B" }}
            >
              {headline || "Your Headline Here"}
            </h2>

            {/* Intro */}
            <p className="text-[10px] md:text-xs text-gray-700 mb-3 leading-relaxed">
              {intro || "Intro paragraph will appear here…"}
            </p>

            {/* Bill grid - 2 columns */}
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              {(bills.length > 0
                ? bills
                : [
                    { billNumber: "HB___", summary: "Bill summary…" },
                    { billNumber: "HB___", summary: "Bill summary…" },
                  ]
              ).map((bill, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded p-2 bg-gray-50"
                >
                  <p
                    className="font-bold text-[10px] mb-0.5"
                    style={{ color: "#1B2C6B" }}
                  >
                    {bill.billNumber}
                  </p>
                  <p className="text-[8px] md:text-[9px] text-gray-600 leading-snug">
                    {bill.summary}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div
              className="mt-2 text-center rounded py-1.5"
              style={{ backgroundColor: "#1B2C6B" }}
            >
              <p className="text-white text-[10px] font-semibold">
                Questions? Call my office: {ctaPhone || "808-586-8480"}
              </p>
            </div>

            {/* Session */}
            <p className="text-center text-[8px] text-gray-400 mt-1">
              {session || "Session / Date"}
            </p>
          </div>
        ) : (
          /* Address side */
          <div className="h-full p-6 flex flex-col justify-between">
            {/* Aloha banner */}
            <div
              className="text-center py-3 rounded-lg"
              style={{ backgroundColor: "#1B2C6B" }}
            >
              <p className="text-white text-2xl font-bold tracking-wide">
                Aloha!
              </p>
            </div>

            <div className="flex-1 flex items-center justify-between px-4">
              {/* Return address */}
              <div className="text-xs text-gray-700 leading-relaxed">
                <p className="font-bold" style={{ color: "#1B2C6B" }}>
                  Rep. Chris Toshiro Todd
                </p>
                <p>Hawaiʻi State Legislature</p>
                <p>415 S. Beretania St., Rm 443</p>
                <p>Honolulu, HI 96813</p>
              </div>

              {/* Stamp / recipient area */}
              <div className="text-right">
                <div className="border-2 border-dashed border-gray-300 w-16 h-12 flex items-center justify-center mb-3 ml-auto">
                  <span className="text-[8px] text-gray-400">STAMP</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>________________________</p>
                  <p>________________________</p>
                  <p>________________________</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
