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
    // PDF: extraire le texte localement (Claude API lit aussi les PDFs en text)
    const extractedText = await fetchAndExtractText(fileUrl, fileName);
    if (extractedText) {
      userContent.push({
        type: "text" as const,
        text: `Voici le contenu du scénario PDF :\n\n${extractedText}`,
      });
    } else {
      // Fallback: send as base64 PDF (Claude API supports it)
      const fs = await import("fs/promises");
      const path = await import("path");
      const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
      const localFile = fileUrl.replace(/^\/uploads\//, "");
      const buffer = await fs.readFile(path.resolve(uploadDir, localFile));
      userContent.push({
        type: "text" as const,
        text: `Voici le contenu du scénario PDF (lu en binaire) :\n\n${buffer.toString("utf-8").substring(0, 100000)}`,
      });
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
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenario_breakdown",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Titre du scénario" },
            screenwriterName: {
              type: ["string", "null"],
              description: "Nom complet du scénariste/auteur (prénom et nom). Si plusieurs auteurs, les séparer par ' & '. null si non trouvé.",
            },
            screenwriterEmail: {
              type: ["string", "null"],
              description: "Email du scénariste si mentionné dans le document, sinon null.",
            },
            screenwriterPhone: {
              type: ["string", "null"],
              description: "Téléphone du scénariste si mentionné dans le document, sinon null.",
            },
            characters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nom du personnage" },
                  gender: {
                    type: "string",
                    enum: ["male", "female", "unknown"],
                    description: "Genre du personnage : male, female, ou unknown si incertain",
                  },
                  age: {
                    type: "string",
                    enum: ["adult", "child", "unknown"],
                    description: "Age du personnage : adult, child, ou unknown si incertain",
                  },
                },
                required: ["name", "gender", "age"],
                additionalProperties: false,
              },
              description: "Liste de tous les personnages uniques avec leur genre et age",
            },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sceneNumber: { type: "integer", description: "Numéro de la scène" },
                  intExt: {
                    type: ["string", "null"],
                    description: "INT. ou EXT. ou INT./EXT.",
                  },
                  location: {
                    type: ["string", "null"],
                    description: "Lieu de la scène",
                  },
                  dayNight: {
                    type: ["string", "null"],
                    description: "JOUR, NUIT, AUBE, CRÉPUSCULE, etc.",
                  },
                  description: {
                    type: ["string", "null"],
                    description: "Brève description de l'action",
                  },
                  characters: {
                    type: "array",
                    items: { type: "string" },
                    description: "Personnages présents dans la scène",
                  },
                  dialogues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        character: { type: "string" },
                        text: { type: "string" },
                      },
                      required: ["character", "text"],
                      additionalProperties: false,
                    },
                    description: "Dialogues de la scène",
                  },
                },
                required: [
                  "sceneNumber",
                  "intExt",
                  "location",
                  "dayNight",
                  "description",
                  "characters",
                  "dialogues",
                ],
                additionalProperties: false,
              },
            },
            props: {
              type: "array",
              items: { type: "string" },
              description: "Liste de tous les accessoires/props du scénario (objets, armes, véhicules, etc.)",
            },
          },
          required: ["title", "screenwriterName", "screenwriterEmail", "screenwriterPhone", "characters", "scenes", "props"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid response");
  }

  try {
    return JSON.parse(content) as ParsedScenario;
  } catch (err) {
    // Tentative de réparation si JSON tronqué
    try {
      // Trouver le dernier objet complet et fermer le JSON
      let fixed = content.trim();
      if (!fixed.endsWith("}")) {
        // Compter les accolades ouvertes et fermer
        let opens = 0;
        for (const c of fixed) { if (c === "{" || c === "[") opens++; else if (c === "}" || c === "]") opens--; }
        // Fermer les structures ouvertes
        const openChars = fixed.match(/[{[]/g)?.length ?? 0;
        const closeChars = fixed.match(/[}\]]/g)?.length ?? 0;
        const diff = openChars - closeChars;
        for (let i = 0; i < diff; i++) fixed += fixed.includes("[") ? "]" : "}";
      }
      return JSON.parse(fixed) as ParsedScenario;
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${err}`);
    }
  }
}
