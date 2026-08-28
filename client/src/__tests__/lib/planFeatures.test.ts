import { describe, it, expect } from "vitest";
import { PLAN_FEATURES, planHasFeature, parseFeatureOverrides } from "@shared/planFeatures";
import { PLAN_PRICING, TRIAL_DAYS, monthlyEquivalent, annualBilling } from "@shared/planPricing";
import type { Plan } from "@shared/types";

const PAID_PLANS: Plan[] = ["individual", "basic", "pro", "club"];

// ── Branding personalizado ────────────────────────────────────────────────────

describe("customBranding", () => {
  it("é exclusivo do plano Club", () => {
    expect(planHasFeature("club", "customBranding")).toBe(true);
    expect(planHasFeature("pro", "customBranding")).toBe(false);
    expect(planHasFeature("individual", "customBranding")).toBe(false);
    expect(planHasFeature("basic", "customBranding")).toBe(false);
  });

  it("pode ser ligado a um plano inferior por override do admin", () => {
    const overrides = parseFeatureOverrides('{"customBranding":true}');
    expect(planHasFeature("individual", "customBranding", overrides)).toBe(true);
  });

  it("pode ser desligado no Club por override do admin", () => {
    const overrides = parseFeatureOverrides('{"customBranding":false}');
    expect(planHasFeature("club", "customBranding", overrides)).toBe(false);
  });

  it("ignora overrides inválidos em vez de rebentar", () => {
    expect(parseFeatureOverrides("isto não é json")).toEqual({});
    expect(parseFeatureOverrides(null)).toEqual({});
    expect(planHasFeature("club", "customBranding", parseFeatureOverrides("{"))).toBe(true);
  });
});

// ── Limites dos planos ────────────────────────────────────────────────────────

describe("limites dos planos", () => {
  it("nenhum plano tem tecto de jogos", () => {
    for (const plan of PAID_PLANS) {
      expect(PLAN_FEATURES[plan].maxMatchesPerTeam).toBe(-1);
    }
  });

  it("o Individual tem 10 PDFs/mês e o Pro+ ilimitados", () => {
    expect(PLAN_FEATURES.individual.maxPdfsPerMonth).toBe(10);
    expect(PLAN_FEATURES.basic.maxPdfsPerMonth).toBe(10);
    expect(PLAN_FEATURES.pro.maxPdfsPerMonth).toBe(-1);
    expect(PLAN_FEATURES.club.maxPdfsPerMonth).toBe(-1);
  });

  it("o alias basic espelha o individual", () => {
    expect(PLAN_FEATURES.basic).toEqual(PLAN_FEATURES.individual);
  });
});

// ── Preços ────────────────────────────────────────────────────────────────────

describe("preços", () => {
  it("o anual é sempre mais barato por mês que o mensal", () => {
    for (const plan of PAID_PLANS) {
      expect(PLAN_PRICING[plan].annual).toBeLessThan(PLAN_PRICING[plan].monthly);
    }
  });

  it("os planos sobem de preço pela ordem esperada", () => {
    expect(PLAN_PRICING.individual.monthly).toBeLessThan(PLAN_PRICING.pro.monthly);
    expect(PLAN_PRICING.pro.monthly).toBeLessThan(PLAN_PRICING.club.monthly);
  });

  it("monthlyEquivalent devolve o valor da periodicidade pedida", () => {
    expect(monthlyEquivalent("pro", false)).toBe(PLAN_PRICING.pro.monthly);
    expect(monthlyEquivalent("pro", true)).toBe(PLAN_PRICING.pro.annual);
  });

  it("annualBilling factura 12x o equivalente mensal anual", () => {
    const { total, saving } = annualBilling("pro");
    expect(total).toBe(PLAN_PRICING.pro.annual * 12);
    expect(saving).toBe(PLAN_PRICING.pro.monthly * 12 - total);
    expect(saving).toBeGreaterThan(0);
  });

  it("o desconto anual é de pelo menos 20% em todos os planos", () => {
    for (const plan of PAID_PLANS) {
      const { total } = annualBilling(plan);
      expect(total).toBeLessThanOrEqual(PLAN_PRICING[plan].monthly * 12 * 0.8);
    }
  });

  it("o trial dá tempo para um ciclo competitivo", () => {
    expect(TRIAL_DAYS).toBeGreaterThanOrEqual(14);
  });
});
