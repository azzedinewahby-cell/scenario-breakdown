import mammoth from "mammoth";
import { XMLParser } from "fast-xml-parser";

/**
 * Extract readable text from a DOCX file buffer.
 * Uses mammoth to convert DOCX to plain text.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extract readable text from an FDX (Final Draft) file buffer.
 * FDX is XML-based; we parse the XML and extract paragraph text.
 */
export function extractTextFromFdx(buffer: Buffer): string {
  const xmlString = buffer.toString("utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });

  const parsed = parser.parse(xmlString);

  const lines: string[] = [];

  // FDX structure: FinalDraft > Content > Paragraph[]
  const content = parsed?.FinalDraft?.Content;
  if (!content) {
    // Try alternative structures
    return xmlString; // fallback: return raw XML text
  }

  let paragraphs = content.Paragraph;
  if (!paragraphs) return xmlString;
  if (!Array.isArray(paragraphs)) paragraphs = [paragraphs];

  for (const para of paragraphs) {
    const type = para["@_Type"] ?? "";
    let texts: string[] = [];

    // Extract text from Text nodes
    let textNodes = para.Text;
    if (textNodes) {
      if (!Array.isArray(textNodes)) textNodes = [textNodes];
      for (const t of textNodes) {
        const val = typeof t === "string" ? t : t["#text"];
        if (val) texts.push(val);
      }
    }

    const lineText = texts.join("").trim();
    if (!lineText) continue;

    // Format based on paragraph type for better LLM parsing
    switch (type) {
      case "Scene Heading":
        lines.push("");
        lines.push(lineText.toUpperCase());
        break;
      case "Action":
        lines.push(lineText);
        break;
      case "Character":
        lines.push("");
        lines.push(`\t\t\t${lineText.toUpperCase()}`);
        break;
      case "Dialogue":
        lines.push(`\t\t${lineText}`);
        break;
      case "Parenthetical":
        lines.push(`\t\t(${lineText})`);
        break;
      case "Transition":
        lines.push("");
        lines.push(`\t\t\t\t\t${lineText.toUpperCase()}`);
        break;
      default:
        lines.push(lineText);
        break;
    }
  }

  return lines.join("\n");
}

/**
 * Fetch a file from URL and extract text based on extension.
 * For PDF files, returns null (handled by LLM directly via file_url).
 */
export async function fetchAndExtractText(
  fileUrl: string,
  fileName: string
): Promise<string | null> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    return null; // PDF handled directly by LLM
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (ext === "docx") {
    return extractTextFromDocx(buffer);
  }

  if (ext === "fdx") {
    return extractTextFromFdx(buffer);
  }

  // Fallback: try to read as text
  return buffer.toString("utf-8");
}
