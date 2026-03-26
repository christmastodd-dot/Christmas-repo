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
    // For .docx and .pdf, read as array buffer and use mammoth / basic extraction
    if (file.name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value;
    }
    if (file.name.endsWith(".pdf")) {
      // Use pdfjs-dist for PDF text extraction
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
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-lg font-semibold text-navy mb-3">Voice Profile</h2>

      {styleGuide ? (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-3 hover:bg-green-100 transition"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Voice profile active
            <span className="text-xs">{expanded ? "▲" : "▼"}</span>
          </button>
          {expanded && (
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 mb-3 whitespace-pre-wrap">
              {styleGuide}
            </div>
          )}
          <label className="text-sm text-navy underline cursor-pointer hover:text-blue-800">
            Re-upload writing sample
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
          <p className="text-sm text-gray-600 mb-3">
            Upload a writing sample (.txt, .docx, or .pdf) — speeches, past postcards, or floor
            statements — to extract Rep. Todd&apos;s voice profile.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded cursor-pointer hover:bg-blue-900 transition">
            {loading ? "Analyzing…" : "Upload Writing Sample"}
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

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
