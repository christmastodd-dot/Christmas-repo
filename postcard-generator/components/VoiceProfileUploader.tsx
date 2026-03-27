"use client";

import { useState, useRef } from "react";

interface Props {
  styleGuide: string;
  onStyleGuide: (guide: string) => void;
}

export default function VoiceProfileUploader({ styleGuide, onStyleGuide }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function extractText(file: File): Promise<string> {
    if (file.name.endsWith(".txt")) {
      return file.text();
    }
    if (file.name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value;
    }
    if (file.name.endsWith(".pdf")) {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pages.push(content.items.map((item: any) => item.str || '').join(" "));
      }
      return pages.join("\n");
    }
    throw new Error("Unsupported file type. Upload .txt, .docx, or .pdf");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const text = await extractText(file);
      const res = await fetch("/api/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      onStyleGuide(data.styleGuide);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Accent edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-navy to-blue-400" />

      <div className="p-5 pl-6">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-navy/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-gray-900 tracking-wide">Voice Profile</h2>
        </div>

        {styleGuide ? (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 mb-3 hover:bg-emerald-100 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Voice profile active
              <svg
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded && (
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 mb-3 whitespace-pre-wrap leading-relaxed border border-gray-100">
                {styleGuide}
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-navy cursor-pointer hover:text-blue-800 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Re-upload sample
              <input
                ref={inputRef}
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Upload a writing sample to extract Rep. Todd&apos;s voice profile for AI-assisted content.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-navy to-blue-800 text-white text-xs font-semibold rounded-xl cursor-pointer hover:shadow-md hover:shadow-navy/20 transition-all active:scale-[0.98]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {loading ? "Analyzing\u2026" : "Upload Writing Sample"}
              <input
                ref={inputRef}
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={handleUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {error && <p className="text-red-600 text-xs mt-2 font-medium">{error}</p>}
      </div>
    </div>
  );
}
