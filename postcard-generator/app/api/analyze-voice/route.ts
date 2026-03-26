import { NextRequest, NextResponse } from "next/server";
import { analyzeVoice } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing text field" },
        { status: 400 }
      );
    }
    const styleGuide = await analyzeVoice(text);
    return NextResponse.json({ styleGuide });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
