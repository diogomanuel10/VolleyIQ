import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
  DetectedPattern,
  PatternDetectionInput,
} from "@shared/types";

/**
 * Pattern Detection. Em modo mock (AI_MOCK=true ou sem ANTHROPIC_API_KEY)
 * devolve três padrões verosímeis para desbloquear UI e E2E.
 */

const AI_MOCK = process.env.AI_MOCK === "true" || !process.env.ANTHROPIC_API_KEY;

const patternSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["serve", "attack", "rotation", "setter", "reception"]),
  confidence: z.number().min(0).max(100),
  evidence: z.string(),
  recommendation: z.string(),
});

const responseSchema = z.object({
  patterns: z.array(patternSchema).min(1).max(8),
});

const SYSTEM_PROMPT = `És um analista de voleibol senior. A partir do dataset
estruturado do adversário, identifica padrões táticos recorrentes e escreve
uma recomendação accionável para a equipa que vai defrontá-lo. Responde
SEMPRE em JSON válido que satisfaça exactamente o schema pedido. Não
inventes dados que não estejam no input; quando a evidência for fraca,
reduz a confidence.`;

function buildUserPrompt(input: PatternDetectionInput) {
  return [
    `Adversário: ${input.opponent}`,
    `Tamanho de amostra (acções): ${input.sampleSize}`,
    "",
    "Serve targets (zona -> nº):",
    JSON.stringify(input.serveTargets),
    "",
    "Distribuição de ataque por rotação (rotação -> zona -> nº):",
    JSON.stringify(input.attackByRotation),
    "",
    "Side-out % por rotação:",
    JSON.stringify(input.rotationSideOut),
    "",
    "Distribuição do distribuidor (pos -> nº de sets):",
    JSON.stringify(input.setterDistribution),
    "",
    "Devolve JSON com a forma: { patterns: DetectedPattern[] }.",
    "Categorias permitidas: serve | attack | rotation | setter | reception.",
    "Confidence é 0..100 (inteiro).",
  ].join("\n");
}

export async function detectPatterns(
  input: PatternDetectionInput,
): Promise<DetectedPattern[]> {
  if (AI_MOCK) return mockPatterns(input);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const resp = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text);
  const parsed = responseSchema.parse(json);
  return parsed.patterns;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI: no JSON found");
  return JSON.parse(raw.slice(start, end + 1));
}

function mockPatterns(input: PatternDetectionInput): DetectedPattern[] {
  const topServeZone =
    Object.entries(input.serveTargets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "5";
  const weakestRotation =
    Object.entries(input.rotationSideOut).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "R1";
  return [
    {
      id: "p-serve",
      title: `Serviço concentrado na zona ${topServeZone}`,
      category: "serve",
      confidence: 82,
      evidence: `Em ${input.sampleSize} acções, a maior fatia de serviços foi para a zona ${topServeZone}.`,
      recommendation: `Prepara o passador dessa zona para serviço em suspensão, e ajusta o recuo do OH que a cobre.`,
    },
    {
      id: "p-rotation",
      title: `Rotação ${weakestRotation} vulnerável em side-out`,
      category: "rotation",
      confidence: 71,
      evidence: `Side-out % mais baixo foi registado na rotação ${weakestRotation}.`,
      recommendation: `Força serviços agressivos quando o adversário chegar a ${weakestRotation}; considera time-out tático se conseguires 2 pontos seguidos.`,
    },
    {
      id: "p-attack",
      title: `Preferência clara do distribuidor pelo OH`,
      category: "setter",
      confidence: 64,
      evidence: "O distribuidor distribui maioritariamente para o OH em situação neutra.",
      recommendation: `Define um duplo bloco escalonado sobre o OH quando o passe for de qualidade boa/perfeita.`,
    },
  ];
}
