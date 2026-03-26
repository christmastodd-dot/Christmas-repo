import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-20250514";

export async function analyzeVoice(text: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Analyze this writing sample from a state legislator. Extract a concise style guide (under 200 words) describing: tone, sentence length, vocabulary level, use of first person, how they refer to constituents, how they frame legislation, and any signature phrases or rhetorical patterns. Output only the style guide as plain text.",
    messages: [{ role: "user", content: text }],
  });
  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

export interface Bill {
  number: string;
  hint: string;
}

export interface GenerateRequest {
  theme: string;
  bills: Bill[];
  styleGuide?: string;
}

export interface GenerateResponse {
  headline: string;
  intro: string;
  bills: { billNumber: string; summary: string }[];
}

export async function generateContent(
  req: GenerateRequest
): Promise<GenerateResponse> {
  const styleClause = req.styleGuide
    ? `Follow this style guide precisely: ${req.styleGuide}`
    : "Use a warm, direct, personally invested, and accessible tone.";

  const system = `You are a writing assistant for Representative Chris Toshiro Todd of the Hawaiʻi State Legislature. Your job is to write constituent postcard copy that sounds exactly like Rep. Todd — warm, direct, personally invested, and accessible to non-experts. Always write in first person. Refer to constituents as 'you' or 'our community'. ${styleClause}`;

  const billList = req.bills
    .map((b) => `${b.number}: ${b.hint}`)
    .join("\n");

  const user = `Generate postcard content for the theme: ${req.theme}

Return JSON with these keys:
- headline: string (bold theme statement, ~6 words)
- intro: string (2–3 sentences, personal and warm, ~60 words)
- bills: array of { billNumber, summary } where summary is 35–45 words, written in first person, explaining why this bill matters to constituents

Bills to summarize:
${billList}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";

  // Extract JSON from possible markdown code fence
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1]!.trim()) as GenerateResponse;
}
