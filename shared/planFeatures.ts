import type { Plan } from "./types";

export interface PlanLimits {
  maxTeams: number;          // -1 = ilimitado
  maxMatchesPerTeam: number; // -1 = ilimitado
  maxPdfsPerMonth: number;   // -1 = ilimitado
  opponents: boolean;
  scenarioModeling: boolean;
  fullAnalytics: boolean;
  exportCsv: boolean;
  aiPatterns: boolean;
  aiTrainingPlans: boolean;
  aiLiveSuggestions: boolean;
  clubDashboard: boolean;
  /** Logótipo e cor do clube no cabeçalho dos relatórios impressos. */
  customBranding: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanLimits> = {
  // Treinador — 1 equipa, tudo o que serve uma equipa: adversários,
  // scenario modeling, detecção de padrões e chat sobre os dados.
  individual: {
    maxTeams: 1,
    maxMatchesPerTeam: -1,
    maxPdfsPerMonth: -1,
    opponents: true,
    scenarioModeling: true,
    fullAnalytics: true,
    exportCsv: true,
    aiPatterns: true,
    aiTrainingPlans: false,
    aiLiveSuggestions: false,
    clubDashboard: false,
    customBranding: false,
  },
  // Alias de basic → mesmo que individual (retrocompatibilidade)
  basic: {
    maxTeams: 1,
    maxMatchesPerTeam: -1,
    maxPdfsPerMonth: -1,
    opponents: true,
    scenarioModeling: true,
    fullAnalytics: true,
    exportCsv: true,
    aiPatterns: true,
    aiTrainingPlans: false,
    aiLiveSuggestions: false,
    clubDashboard: false,
    customBranding: false,
  },
  // `pro` é o nome antigo do escalão de clube. Mantém-se no enum para não
  // partir subscrições anteriores, com as 5 equipas que tinha na altura.
  pro: {
    maxTeams: 5,
    maxMatchesPerTeam: -1,
    maxPdfsPerMonth: -1,
    opponents: true,
    scenarioModeling: true,
    fullAnalytics: true,
    exportCsv: true,
    aiPatterns: true,
    aiTrainingPlans: true,
    aiLiveSuggestions: true,
    clubDashboard: true,
    customBranding: true,
  },
  // Clube — equipas ilimitadas e tudo activo.
  club: {
    maxTeams: -1,
    maxMatchesPerTeam: -1,
    maxPdfsPerMonth: -1,
    opponents: true,
    scenarioModeling: true,
    fullAnalytics: true,
    exportCsv: true,
    aiPatterns: true,
    aiTrainingPlans: true,
    aiLiveSuggestions: true,
    clubDashboard: true,
    customBranding: true,
  },
};

export type FeatureOverrides = Partial<Record<keyof PlanLimits, boolean>>;

export function parseFeatureOverrides(raw: string | null | undefined): FeatureOverrides {
  if (!raw) return {};
  try { return JSON.parse(raw) as FeatureOverrides; } catch { return {}; }
}

export function planHasFeature(
  plan: Plan,
  feature: keyof PlanLimits,
  overrides?: FeatureOverrides,
): boolean {
  if (overrides && feature in overrides) return overrides[feature]!;
  const limits = PLAN_FEATURES[plan] ?? PLAN_FEATURES["individual"];
  const val = limits[feature];
  return typeof val === "boolean" ? val : (val as number) !== 0;
}

/** Ordem dos planos para comparações de "mínimo plano necessário". */
const PLAN_ORDER: Plan[] = ["individual", "basic", "pro", "club"];

export function planMeetsMinimum(plan: Plan, minimum: Plan): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(minimum);
}

export const PLAN_LABELS: Record<Plan, string> = {
  individual: "Treinador",
  basic: "Treinador",
  pro: "Clube",
  club: "Clube",
};

export const PLAN_UPGRADE_LABEL: Record<Plan, string> = {
  individual: "Fazer upgrade para Clube",
  basic: "Fazer upgrade para Clube",
  pro: "",
  club: "",
};
