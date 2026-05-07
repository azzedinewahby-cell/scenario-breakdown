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

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = { type: "function"; function: { name: string } };
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

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

const normalizeContent = (content: MessageContent | MessageContent[]): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(c => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("\n");
  }
  if (content.type === "text") return content.text;
  return "";
};

const normalizeMessage = (msg: Message) => ({
  role: msg.role,
  content: normalizeContent(msg.content),
  ...(msg.name ? { name: msg.name } : {}),
  ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {}),
});

const normalizeToolChoice = (tc?: ToolChoice, tools?: Tool[]) => {
  if (!tc) return undefined;
  if (tc === "none" || tc === "auto") return tc;
  if (tc === "required" && tools?.length === 1) return { type: "function", function: { name: tools[0].function.name } };
  if ("name" in tc) return { type: "function", function: { name: tc.name } };
  return tc;
};

const normalizeResponseFormat = ({ responseFormat, response_format, outputSchema, output_schema }: {
  responseFormat?: ResponseFormat; response_format?: ResponseFormat;
  outputSchema?: OutputSchema; output_schema?: OutputSchema;
}) => {
  const fmt = responseFormat || response_format;
  if (fmt) return fmt;
  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  return { type: "json_schema" as const, json_schema: { name: schema.name, schema: schema.schema, strict: schema.strict } };
};

// Gemini via OpenAI-compatible endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const { messages, tools, toolChoice, tool_choice, outputSchema, output_schema, responseFormat, response_format } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
    max_tokens: 32768,
  };

  if (tools?.length) payload.tools = tools;
  const tc = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (tc) payload.tool_choice = tc;

  const fmt = normalizeResponseFormat({ responseFormat, response_format, outputSchema, output_schema });
  if (fmt) payload.response_format = fmt;

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} – ${err}`);
  }

  return (await response.json()) as InvokeResult;
}
