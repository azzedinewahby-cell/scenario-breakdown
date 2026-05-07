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
const MODEL = "claude-sonnet-4-6"; // Bon rapport qualité/prix pour le dépouillement

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
    .map(m => ({ role: m.role as "user" | "assistant", content: contentToText(m.content) }));

  // Si une réponse JSON est demandée, on instruit Claude dans le system prompt
  let systemPrompt = systemMessages.join("\n\n");
  const fmt = params.responseFormat || params.response_format;
  const schema = params.outputSchema || params.output_schema;
  if (fmt?.type === "json_object" || fmt?.type === "json_schema" || schema) {
    const schemaObj = (fmt as any)?.json_schema?.schema ?? schema?.schema;
    systemPrompt += "\n\nIMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après. ";
    if (schemaObj) {
      systemPrompt += `Le JSON doit suivre ce schéma: ${JSON.stringify(schemaObj)}`;
    }
  }

  const payload: Record<string, unknown> = {
    model: MODEL,
    max_tokens: params.maxTokens ?? params.max_tokens ?? 8192,
    messages: otherMessages,
  };
  if (systemPrompt.trim()) payload.system = systemPrompt;

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
  // Extrait le texte de la réponse Claude
  const textContent = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  // Si réponse JSON attendue, nettoie les éventuels backticks markdown
  let cleanText = textContent;
  if (fmt?.type === "json_object" || fmt?.type === "json_schema" || schema) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // Retourne en format OpenAI pour compatibilité
  return {
    id: data.id ?? "claude-response",
    created: Math.floor(Date.now() / 1000),
    model: data.model ?? MODEL,
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
