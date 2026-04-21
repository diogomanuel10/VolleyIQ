import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  TRAINING_FOCI,
  TRAINING_PRIORITIES,
  type TrainingRecommendation,
  type TrainingRecommendationInput,
} from "@shared/types";

/**
 * Recomendações de treino por jogadora. Replica o padrão do `patterns.ts`:
 * modo mock sempre que não há ANTHROPIC_API_KEY ou AI_MOCK=true, para dev
 * local e E2E nunca bloquearem.
 */

const AI_MOCK = process.env.AI_MOCK === "true" || !process.env.ANTHROPIC_API_KEY;

const drillSchema = z.object({
  name: z.string(),
  durationMin: z.number().int().min(5).max(120),
  description: z.string(),
});

const recommendationSchema = z.object({
  title: z.string(),
  focus: z.enum(TRAINING_FOCI),
  priority: z.enum(TRAINING_PRIORITIES),
  rationale: z.string(),
  drills: z.array(drillSchema).min(1).max(5),
});

const responseSchema = z.object({
  recommendations: z.array(recommendationSchema).min(1).max(3),
});

const SYSTEM_PROMPT = `És um treinador de voleibol com 20 anos de experiência.
A partir dos KPIs individuais de uma atleta, desenha entre 1 e 3 recomendações
de treino com drills concretos. Responde SEMPRE em JSON válido que respeite o
schema pedido. Sê específico: cada drill tem nome, duração em minutos e uma
descrição accionável em 1-2 frases (pt-PT).`;

function buildUserPrompt(input: TrainingRecommendationInput) {
  return [
    `Atleta: #${input.firstName} ${input.lastName} (${input.position})`,
    `Amostra: ${input.sampleActions} acções registadas`,
    "",
    "KPIs:",
    JSON.stringify(input.kpis, null, 2),
    "",
    "Fraquezas detectadas:",
    input.weaknesses.length
      ? input.weaknesses.map((w) => `- ${w}`).join("\n")
      : "- (nenhuma detectada)",
    "",
    "Devolve JSON com a forma: { recommendations: TrainingRecommendation[] }.",
    `Foci permitidos: ${TRAINING_FOCI.join(" | ")}.`,
    `Prioridades permitidas: ${TRAINING_PRIORITIES.join(" | ")}.`,
  ].join("\n");
}

export async function recommendTraining(
  input: TrainingRecommendationInput,
): Promise<TrainingRecommendation[]> {
  if (AI_MOCK) return mockRecommendations(input);

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
  return parsed.recommendations;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI: no JSON found");
  return JSON.parse(raw.slice(start, end + 1));
}

function mockRecommendations(
  input: TrainingRecommendationInput,
): TrainingRecommendation[] {
  const { kpis, position, firstName } = input;
  // Escolhe o foco a partir do pior KPI relativo ao par esperado para a posição.
  const focus =
    kpis.passRating < 2
      ? "reception"
      : kpis.killPct < 40 && (position === "OH" || position === "OPP")
        ? "attack"
        : kpis.blocks < 1 && position === "MB"
          ? "block"
          : kpis.serveAcePct < 6
            ? "serve"
            : "defense";

  const priority =
    kpis.passRating < 1.5 || kpis.killPct < 30 ? "high" : "medium";

  return [
    {
      title: `Bloco ${focusLabel(focus)} para ${firstName}`,
      focus,
      priority,
      rationale:
        input.weaknesses[0] ??
        `Detectámos margem para subir em ${focusLabel(focus)} com base nos KPIs do último ciclo.`,
      drills: drillPack(focus),
    },
  ];
}

function focusLabel(f: TrainingRecommendation["focus"]) {
  return (
    {
      serve: "serviço",
      attack: "ataque",
      reception: "recepção",
      block: "bloco",
      defense: "defesa",
      setting: "distribuição",
    } as const
  )[f];
}

function drillPack(
  focus: TrainingRecommendation["focus"],
): TrainingRecommendation["drills"] {
  switch (focus) {
    case "reception":
      return [
        {
          name: "Serve-receive em par",
          durationMin: 20,
          description: "200 serviços variando zona e intensidade; alvo: 70% perfeitos/bons.",
        },
        {
          name: "Controlo de bola baixa",
          durationMin: 15,
          description: "Passes a chegar rasos; enfase em postura e leitura de chicote.",
        },
      ];
    case "attack":
      return [
        {
          name: "Ataque sobre bloco de 2",
          durationMin: 25,
          description: "Cones no bloco adversário; trabalhar linha e diagonal com decisão tardia.",
        },
        {
          name: "Ataque atrás da 3m",
          durationMin: 15,
          description: "Passes altos rápidos para pipe; foco em timing e amplitude de braço.",
        },
      ];
    case "block":
      return [
        {
          name: "Bloco em leitura",
          durationMin: 20,
          description: "Ler setter e ombros do atacante; penetrar com timing de 1 contagem.",
        },
        {
          name: "Bloco 2 em C",
          durationMin: 15,
          description: "Coordenação OH+MB em diagonal; fechar linha do ataque.",
        },
      ];
    case "serve":
      return [
        {
          name: "Serviço em potência",
          durationMin: 15,
          description: "Séries de 10 para zona 1 e 5; subir progressivamente a velocidade.",
        },
        {
          name: "Serviço flutuante curto",
          durationMin: 15,
          description: "Ataque em passadores que avançam; variar zona 4/2/6.",
        },
      ];
    case "defense":
      return [
        {
          name: "Reflex drill",
          durationMin: 15,
          description: "Ataques livres vindos de várias zonas; foco em posição baixa e salto lateral.",
        },
        {
          name: "Cover + contra-ataque",
          durationMin: 20,
          description: "Depois do bloco adversário; transição imediata para contra-ataque.",
        },
      ];
    case "setting":
      return [
        {
          name: "Distribuição em apoio",
          durationMin: 20,
          description: "Alternar 4/2/3 com saída do passe; insistir na altura e ritmo constante.",
        },
        {
          name: "Distribuição em salto",
          durationMin: 15,
          description: "Pipes com setter em salto; reduzir telegrafia.",
        },
      ];
  }
}
