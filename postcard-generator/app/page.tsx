"use client";

import { useState } from "react";
import VoiceProfileUploader from "@/components/VoiceProfileUploader";
import BillFieldset, { BillField } from "@/components/BillFieldset";
import PostcardPreview from "@/components/PostcardPreview";
import ExportButtons from "@/components/ExportButtons";

export default function Home() {
  const [styleGuide, setStyleGuide] = useState("");

  // Form fields
  const [headline, setHeadline] = useState("");
  const [intro, setIntro] = useState("");
  const [bills, setBills] = useState<BillField[]>([
    { number: "", summary: "" },
    { number: "", summary: "" },
  ]);
  const [ctaPhone, setCtaPhone] = useState("808-586-8480");
  const [session, setSession] = useState("");

  // Derived bill data for preview / export
  const previewBills = bills
    .filter((b) => b.number || b.summary)
    .map((b) => ({
      billNumber: b.number,
      summary: b.summary,
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-blue-900 to-navy" />
        <div className="relative max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">
              Rep. Todd Postcard Generator
            </h1>
            <p className="text-[11px] text-blue-300 tracking-widest uppercase mt-0.5">
              Hawaiʻi State Legislature — Constituent Communications
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <ExportButtons
              headline={headline}
              intro={intro}
              bills={previewBills}
              ctaPhone={ctaPhone}
              session={session}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT — Form (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Voice Profile */}
            <VoiceProfileUploader
              styleGuide={styleGuide}
              onStyleGuide={setStyleGuide}
            />

            {/* Content Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-sm font-bold text-gray-900 tracking-wide">
                  Postcard Content
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Fill in each field as it should appear on the final postcard
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Headline */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 tracking-wide uppercase mb-1.5">
                    Headline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Protecting Our Community From Wildfires"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/50 focus:bg-white transition"
                  />
                </div>

                {/* Intro */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 tracking-wide uppercase mb-1.5">
                    Intro Paragraph
                  </label>
                  <textarea
                    placeholder="Write a warm, personal intro (2-3 sentences)..."
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/50 focus:bg-white transition resize-none"
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Bills */}
                <BillFieldset bills={bills} onChange={setBills} />

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Bottom row — CTA + Session side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 tracking-wide uppercase mb-1.5">
                      CTA Phone Number
                    </label>
                    <input
                      type="text"
                      value={ctaPhone}
                      onChange={(e) => setCtaPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/50 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 tracking-wide uppercase mb-1.5">
                      Session / Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. February 2024"
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/50 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile export buttons */}
            <div className="sm:hidden bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 tracking-wide mb-3">
                Export
              </h2>
              <ExportButtons
                headline={headline}
                intro={intro}
                bills={previewBills}
                ctaPhone={ctaPhone}
                session={session}
              />
            </div>
          </div>

          {/* RIGHT — Live Preview (2 cols) */}
          <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 tracking-wide">
                Live Preview
              </h2>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase">
                Updates in real time
              </span>
            </div>
            <PostcardPreview
              headline={headline}
              intro={intro}
              bills={previewBills}
              ctaPhone={ctaPhone}
              session={session}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
