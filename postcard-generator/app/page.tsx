"use client";

import { useState } from "react";
import VoiceProfileUploader from "@/components/VoiceProfileUploader";
import BillFieldset, { BillField } from "@/components/BillFieldset";
import PostcardPreview from "@/components/PostcardPreview";
import ExportButtons from "@/components/ExportButtons";

export default function Home() {
  const [styleGuide, setStyleGuide] = useState("");

  // Form fields
  const [theme, setTheme] = useState("");
  const [headline, setHeadline] = useState("");
  const [intro, setIntro] = useState("");
  const [bills, setBills] = useState<BillField[]>([
    { number: "", hint: "" },
    { number: "", hint: "" },
  ]);
  const [ctaPhone, setCtaPhone] = useState("808-586-8480");
  const [session, setSession] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Derived bill data for preview / export
  const previewBills = bills
    .filter((b) => b.number || b.summary)
    .map((b) => ({
      billNumber: b.number,
      summary: b.summary || b.hint,
    }));

  async function handleGenerate() {
    if (!theme) {
      setError("Please enter a theme.");
      return;
    }
    const validBills = bills.filter((b) => b.number && b.hint);
    if (validBills.length < 2) {
      setError("Please fill in at least 2 bills with number and topic hint.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          bills: validBills.map((b) => ({ number: b.number, hint: b.hint })),
          styleGuide: styleGuide || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setHeadline(data.headline);
      setIntro(data.intro);

      // Merge generated summaries back into bills
      const updatedBills = bills.map((b) => {
        const match = data.bills?.find(
          (gb: { billNumber: string; summary: string }) =>
            gb.billNumber === b.number
        );
        return match ? { ...b, summary: match.summary } : b;
      });
      setBills(updatedBills);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">Rep. Todd Postcard Generator</h1>
          <p className="text-sm text-blue-200">
            Hawaiʻi State Legislature — Constituent Communications
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT — Form */}
          <div className="space-y-6">
            {/* Feature 1: Voice Profile */}
            <VoiceProfileUploader
              styleGuide={styleGuide}
              onStyleGuide={setStyleGuide}
            />

            {/* Feature 2: Postcard Content Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-navy mb-4">
                Postcard Content
              </h2>

              <div className="space-y-4">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">
                    Theme
                  </label>
                  <input
                    type="text"
                    placeholder='e.g. "Wildfire Support & Prevention"'
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-suggested from theme via AI"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>

                {/* Intro */}
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">
                    Intro Paragraph
                  </label>
                  <textarea
                    placeholder="AI-generated intro — editable after generation"
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>

                {/* Bills */}
                <BillFieldset bills={bills} onChange={setBills} />

                {/* CTA Phone */}
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">
                    CTA Phone Number
                  </label>
                  <input
                    type="text"
                    value={ctaPhone}
                    onChange={(e) => setCtaPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>

                {/* Session / Date */}
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">
                    Session / Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. February 2024"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-600 text-sm mt-3">{error}</p>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-5 w-full py-2.5 bg-navy text-white font-semibold rounded hover:bg-blue-900 transition disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate Content"}
              </button>
            </div>

            {/* Feature 4: Export Buttons */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-navy mb-3">Export</h2>
              <ExportButtons
                headline={headline}
                intro={intro}
                bills={previewBills}
                ctaPhone={ctaPhone}
                session={session}
              />
            </div>
          </div>

          {/* RIGHT — Live Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <h2 className="text-lg font-semibold text-navy mb-3">
              Live Preview
            </h2>
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
