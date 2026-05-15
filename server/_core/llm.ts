import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
};

export type ToolChoice = "none" | "auto" | "required" | { name: string } | { type: "function"; function: { name: string } };
export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /** Model speed/quality preference. "fast" = Haiku 4.5, "smart" = Sonnet 4.6 (default: "fast") */
  speed?: "fast" | "smart";
};

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

// Conserve le format de réponse OpenAI pour compatibilité avec le reste du code
export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: Role; content: string; tool_calls?: ToolCall[] };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL_FAST = "claude-haiku-4-5-20251001";  // 3-5x plus rapide pour l'extraction
const MODEL_SMART = "claude-sonnet-4-6";          // Pour la rédaction (synopsis)

const contentToText = (content: MessageContent | MessageContent[]): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(c => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("\n");
  }
  return content.type === "text" ? content.text : "";
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.anthropicApiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");

  // Sépare le message system des autres
  const systemMessages = params.messages.filter(m => m.role === "system").map(m => contentToText(m.content));
  const otherMessages = params.messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({
      role: m.role as "user" | "assistant",
      // Si content est un tableau (ex: PDF en base64), on le passe tel quel à l'API Anthropic
      content: Array.isArray(m.content) && m.content.some((c: any) => c.type === "document" || c.type === "image")
        ? (m.content as any[]).map((c: any) => {
            if (typeof c === "string") return { type: "text", text: c };
            if (c.type === "text") return c;
            if (c.type === "document") return c;
            if (c.type === "image") return c;
            return { type: "text", text: "" };
          })
        : contentToText(m.content),
    }));

  // Si une réponse JSON est demandée, on instruit Claude dans le system prompt
  let systemPrompt = systemMessages.join("\n\n");
  const fmt = params.responseFormat || params.response_format;
  const schema = params.outputSchema || params.output_schema;
  if (fmt?.type === "json_object" || fmt?.type === "json_schema" || schema) {
    const schemaObj = (fmt as any)?.json_schema?.schema ?? schema?.schema;
    systemPrompt = "Tu es un assistant qui répond UNIQUEMENT en JSON valide. Pas de markdown, pas de backticks, pas de texte avant ou après. Commence ta réponse directement par { et termine par }.\n\n" + systemPrompt;
    if (schemaObj) {
      systemPrompt += `\n\nLe JSON doit suivre ce schéma: ${JSON.stringify(schemaObj)}`;
    }
    systemPrompt += "\n\nRAPPEL: Ta réponse doit commencer par { et contenir UNIQUEMENT du JSON valide.";
  }

  const model = params.speed === "smart" ? MODEL_SMART : MODEL_FAST;
  const payload: Record<string, unknown> = {
    model,
    max_tokens: params.maxTokens ?? params.max_tokens ?? 16384,
    messages: otherMessages,
  };
  if (systemPrompt.trim()) payload.system = systemPrompt;

  const expectsJson = fmt?.type === "json_object" || fmt?.type === "json_schema" || !!schema;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API failed: ${response.status} ${response.statusText} – ${err}`);
  }

  const data = await response.json() as any;
  const textContent = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  // Extraction robuste du JSON s'il est attendu
  let cleanText = textContent;
  if (expectsJson) {
    // Retire les backticks markdown
    cleanText = cleanText.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "");
    // Trouve le premier { et le dernier } pour extraire le JSON même s'il y a du texte autour
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    cleanText = cleanText.trim();
  }

  // Retourne en format OpenAI pour compatibilité
  return {
    id: data.id ?? "claude-response",
    created: Math.floor(Date.now() / 1000),
    model: data.model ?? model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: cleanText },
      finish_reason: data.stop_reason ?? "stop",
    }],
    usage: data.usage ? {
      prompt_tokens: data.usage.input_tokens ?? 0,
      completion_tokens: data.usage.output_tokens ?? 0,
      total_tokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
    } : undefined,
  };
}
