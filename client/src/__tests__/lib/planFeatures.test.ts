import { describe, it, expect } from "vitest";
import { PLAN_FEATURES, planHasFeature, parseFeatureOverrides } from "@shared/planFeatures";
import { PLAN_PRICING, TRIAL_DAYS, monthlyEquivalent, annualBilling } from "@shared/planPricing";
import type { Plan } from "@shared/types";

const ALL_PLANS: Plan[] = ["individual", "basic", "pro", "club"];

/** Nomes que representam o escalão Treinador (`basic` é o alias legado). */
const COACH_PLANS: Plan[] = ["individual", "basic"];
/** Nomes que representam o escalão Clube (`pro` é o alias legado). */
const CLUB_PLANS: Plan[] = ["pro", "club"];

/** Funcionalidades exclusivas do escalão de clube. */
const CLUB_ONLY = [
  "aiTrainingPlans",
  "aiLiveSuggestions",
  "clubDashboard",
  "customBranding",
] as const;

/** Funcionalidades que o Treinador também tem — não diferenciam plano. */
const IN_EVERY_PLAN = [
  "opponents",
  "scenarioModeling",
  "fullAnalytics",
  "exportCsv",
  "aiPatterns",
] as const;

// ── Dois escalões ─────────────────────────────────────────────────────────────

describe("estrutura de dois escalões", () => {
  it("o Clube tem todas as funcionalidades exclusivas e o Treinador nenhuma", () => {
    for (const feature of CLUB_ONLY) {
      for (const plan of CLUB_PLANS) {
        expect(planHasFeature(plan, feature), `${plan}.${feature}`).toBe(true);
      }
      for (const plan of COACH_PLANS) {
        expect(planHasFeature(plan, feature), `${plan}.${feature}`).toBe(false);
      }
    }
  });

  it("tudo o que serve uma equipa está em todos os planos", () => {
    for (const feature of IN_EVERY_PLAN) {
      for (const plan of ALL_PLANS) {
        expect(planHasFeature(plan, feature), `${plan}.${feature}`).toBe(true);
      }
    }
  });

  it("os aliases legados espelham o escalão a que pertencem", () => {
    expect(PLAN_FEATURES.basic).toEqual(PLAN_FEATURES.individual);
    // `pro` guarda o limite de 5 equipas que tinha quando foi vendido; as
    // funcionalidades são as do Clube.
    for (const feature of [...CLUB_ONLY, ...IN_EVERY_PLAN]) {
      expect(PLAN_FEATURES.pro[feature], feature).toBe(PLAN_FEATURES.club[feature]);
    }
  });

  it("só o Clube tem equipas ilimitadas", () => {
    expect(PLAN_FEATURES.individual.maxTeams).toBe(1);
    expect(PLAN_FEATURES.basic.maxTeams).toBe(1);
    expect(PLAN_FEATURES.club.maxTeams).toBe(-1);
    expect(PLAN_FEATURES.pro.maxTeams).toBe(5); // subscrições antigas
  });

  it("nenhum plano tem tecto de jogos nem de PDFs", () => {
    for (const plan of ALL_PLANS) {
      expect(PLAN_FEATURES[plan].maxMatchesPerTeam, plan).toBe(-1);
      expect(PLAN_FEATURES[plan].maxPdfsPerMonth, plan).toBe(-1);
    }
  });
});

// ── Overrides do admin ────────────────────────────────────────────────────────

describe("overrides de funcionalidade", () => {
  it("podem ligar uma funcionalidade de clube num plano Treinador", () => {
    const overrides = parseFeatureOverrides('{"customBranding":true}');
    expect(planHasFeature("individual", "customBranding", overrides)).toBe(true);
  });

  it("podem desligar uma funcionalidade no Clube", () => {
    const overrides = parseFeatureOverrides('{"customBranding":false}');
    expect(planHasFeature("club", "customBranding", overrides)).toBe(false);
  });

  it("ignoram JSON inválido em vez de rebentar", () => {
    expect(parseFeatureOverrides("isto não é json")).toEqual({});
    expect(parseFeatureOverrides(null)).toEqual({});
    expect(planHasFeature("club", "customBranding", parseFeatureOverrides("{"))).toBe(true);
  });
});

// ── Preços ────────────────────────────────────────────────────────────────────

describe("preços", () => {
  it("o anual é sempre mais barato por mês que o mensal", () => {
    for (const plan of ALL_PLANS) {
      expect(PLAN_PRICING[plan].annual, plan).toBeLessThan(PLAN_PRICING[plan].monthly);
    }
  });

  it("o Clube custa mais que o Treinador, e os aliases custam o mesmo", () => {
    expect(PLAN_PRICING.individual.monthly).toBeLessThan(PLAN_PRICING.club.monthly);
    expect(PLAN_PRICING.basic).toEqual(PLAN_PRICING.individual);
    expect(PLAN_PRICING.pro).toEqual(PLAN_PRICING.club);
  });

  it("o Clube compensa a partir de 3 equipas face a lugares de Treinador", () => {
    const coach = PLAN_PRICING.individual.monthly;
    const club = PLAN_PRICING.club.monthly;
    expect(2 * coach).toBeLessThan(club); // com 2 equipas ainda sai mais barato avulso
    expect(3 * coach).toBeGreaterThan(club); // a partir de 3 compensa o Clube
  });

  it("monthlyEquivalent devolve o valor da periodicidade pedida", () => {
    expect(monthlyEquivalent("club", false)).toBe(PLAN_PRICING.club.monthly);
    expect(monthlyEquivalent("club", true)).toBe(PLAN_PRICING.club.annual);
  });

  it("annualBilling factura 12x o equivalente mensal anual", () => {
    const { total, saving } = annualBilling("club");
    expect(total).toBe(PLAN_PRICING.club.annual * 12);
    expect(saving).toBe(PLAN_PRICING.club.monthly * 12 - total);
    expect(saving).toBeGreaterThan(0);
  });

  it("o desconto anual é de pelo menos 20% em todos os planos", () => {
    for (const plan of ALL_PLANS) {
      const { total } = annualBilling(plan);
      expect(total, plan).toBeLessThanOrEqual(PLAN_PRICING[plan].monthly * 12 * 0.8);
    }
  });

  it("o trial dá tempo para um ciclo competitivo", () => {
    expect(TRIAL_DAYS).toBeGreaterThanOrEqual(14);
  });
});
