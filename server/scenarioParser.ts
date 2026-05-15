import { invokeLLM } from "./_core/llm";
import { fetchAndExtractText } from "./fileExtractor";

export interface ParsedScene {
  sceneNumber: number;
  intExt: string | null;
  location: string | null;
  dayNight: string | null;
  description: string | null;
  characters: string[];
  dialogues: { character: string; text: string }[];
}

export interface ParsedCharacter {
  name: string;
  gender: "male" | "female" | "unknown";
  age: "adult" | "child" | "unknown";
}

export interface ParsedScenario {
  title: string;
  screenwriterName: string | null;
  screenwriterEmail: string | null;
  screenwriterPhone: string | null;
  scenes: ParsedScene[];
  characters: ParsedCharacter[];
  props: string[];
}

/**
 * Parse scenario text using LLM to extract structured breakdown data.
 * Supports PDF (sent as file_url), FDX and DOCX (extracted to text first).
 */
export async function parseScenarioWithLLM(
  fileUrl: string,
  fileName: string
): Promise<ParsedScenario> {
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  const systemPrompt = `Tu es un assistant spécialisé dans le dépouillement de scénarios de cinéma et audiovisuel.
À partir du contenu d'un scénario, tu dois extraire de manière structurée :
- Le titre du scénario (déduit du contenu ou du nom de fichier)
- Le nom complet du scénariste/auteur (prénom et nom, souvent sur la page de titre, après "Écrit par", "Written by", "De", ou en bas de la page de titre). Si plusieurs auteurs, les séparer par " & ".
- L'email du scénariste si mentionné dans le document (sinon null)
- Le téléphone du scénariste si mentionné dans le document (sinon null)
- La liste complète des scènes avec pour chacune :
  - Le numéro de scène
  - INT. ou EXT. (intérieur/extérieur)
  - Le lieu
  - JOUR ou NUIT
  - Une brève description de l'action
  - Les personnages présents dans la scène
  - Les dialogues avec le nom du personnage et le texte
- La liste de tous les personnages uniques du scénario avec leur genre (male, female, ou unknown si incertain) et leur âge (adult, child, ou unknown si incertain)
- La liste de tous les accessoires/props mentionnés dans le scénario (objets, armes, véhicules, etc.)

Réponds UNIQUEMENT en JSON valide selon le schéma fourni. Ne fais aucun commentaire en dehors du JSON.
Si une information n'est pas disponible, utilise null.
Numérote les scènes séquentiellement si elles ne sont pas numérotées dans le texte.`;

  const userContent: any[] = [
    {
      type: "text" as const,
      text: `Analyse ce scénario et extrais le dépouillement complet. Le fichier s'appelle "${fileName}".`,
    },
  ];

  if (isPdf) {
    // Envoyer le PDF directement à Claude en base64 (API Anthropic supporte les PDFs nativement)
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
      const localFile = fileUrl.replace(/^\/uploads\//, "");
      const buffer = await fs.readFile(path.resolve(uploadDir, localFile));
      const base64 = buffer.toString("base64");
      userContent.push({
        type: "document" as const,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      } as any);
    } catch (e) {
      // Fallback: extraction texte
      const extractedText = await fetchAndExtractText(fileUrl, fileName);
      if (extractedText && extractedText.trim().length > 100) {
        userContent.push({ type: "text" as const, text: `Voici le contenu extrait du PDF :\n\n${extractedText}` });
      } else {
        throw new Error("Impossible de lire le PDF. Vérifiez que le fichier n'est pas protégé ou corrompu.");
      }
    }
  } else {
    // DOCX/FDX: extract text first, then send as text
    const extractedText = await fetchAndExtractText(fileUrl, fileName);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Impossible d'extraire le texte du fichier. Le fichier est peut-être vide ou corrompu.");
    }
    userContent.push({
      type: "text" as const,
      text: `Voici le contenu du scénario :\n\n${extractedText}`,
    });
  }

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 64000,
  });

  const content = result.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid response");
  }

  // Extraction robuste : trouver le premier { et le dernier }
  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    console.error("[Parser] No JSON found in response, first 200 chars:", content.slice(0, 200));
    throw new Error(`Failed to parse LLM response as JSON: no JSON object found`);
  }
  try {
    return JSON.parse(content.slice(first, last + 1)) as ParsedScenario;
  } catch (err) {
    console.error("[Parser] JSON parse error, first 200 chars of slice:", content.slice(first, first + 200));
    throw new Error(`Failed to parse LLM response as JSON: ${err}`);
  }
}
