import { NextRequest, NextResponse } from "next/server";
import { generateContent, GenerateRequest } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    if (!body.theme || !body.bills || body.bills.length < 2 || body.bills.length > 4) {
      return NextResponse.json(
        { error: "Provide a theme and 2–4 bills" },
        { status: 400 }
      );
    }
    const result = await generateContent(body);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
