import OpenAI from "openai";

export const SYSTEM_PROMPT = `You are a code generation engine. Your job is to generate complete, working frontend application code.

RULES:
- Always return ALL project files in full (never diffs or partial updates)
- Respond ONLY with valid JSON — no markdown fences, no explanation outside JSON
- Use a simple stack: plain HTML/CSS/JS or React with CDN imports
- Code must run immediately without any build step or manual setup
- Keep it simple — the generated app runs directly in a browser iframe

RESPONSE FORMAT (strict JSON, no markdown):
{"files":[{"path":"index.html","content":"..."},{"path":"style.css","content":"..."}],"message":"brief description of what was built"}

If the user asks for changes, return all files again with the changes applied.`;

export interface GeneratedOutput {
  files: Array<{ path: string; content: string }>;
  message: string;
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required for code generation");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateWithOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<GeneratedOutput> {
  const openai = getOpenAIClient();

  const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let response: string | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 16000,
      });

      response = completion.choices[0]?.message?.content ?? null;
      if (!response) throw new Error("Empty response from OpenAI");

      const cleaned = response
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as GeneratedOutput;

      if (!Array.isArray(parsed.files) || typeof parsed.message !== "string") {
        throw new Error("Invalid JSON structure from OpenAI");
      }

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed after 3 attempts: ${lastError?.message}`);
}

export async function* streamWithOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): AsyncGenerator<string> {
  const openai = getOpenAIClient();

  const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: chatMessages,
    temperature: 0.2,
    max_tokens: 16000,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export function parseGeneratedOutput(raw: string): GeneratedOutput {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as GeneratedOutput;

  if (!Array.isArray(parsed.files) || typeof parsed.message !== "string") {
    throw new Error("Invalid JSON structure from OpenAI");
  }

  return parsed;
}
