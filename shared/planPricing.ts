import type { Plan } from "./types";

/** Duração do trial gratuito, em dias. Sem cartão de crédito. */
export const TRIAL_DAYS = 30;

/**
 * Fonte única de verdade dos preços (EUR).
 *
 * `monthly` — valor cobrado por mês na subscrição mensal.
 * `annual`  — valor *equivalente mensal* da subscrição anual; o valor
 *             efectivamente cobrado no checkout é `annual * 12`.
 *
 * A landing page (`landing/index.html`) é HTML estático e não consegue
 * importar isto — se mexeres aqui, actualiza lá também.
 */
export interface PlanPrice {
  monthly: number;
  annual: number;
}

export const PLAN_PRICING: Record<Plan, PlanPrice> = {
  // Treinador — uma equipa
  individual: { monthly: 19, annual: 15 },
  basic: { monthly: 19, annual: 15 }, // alias legado de individual
  // Clube — equipas ilimitadas. `pro` é o nome antigo deste escalão e
  // mantém-se no enum para não partir quem subscreveu antes de 2026/27.
  pro: { monthly: 49, annual: 39 },
  club: { monthly: 49, annual: 39 },
};

/** Preço a mostrar por mês, conforme a periodicidade escolhida. */
export function monthlyEquivalent(plan: Plan, annual: boolean): number {
  const price = PLAN_PRICING[plan] ?? PLAN_PRICING.individual;
  return annual ? price.annual : price.monthly;
}

/** Total facturado num ano em cada periodicidade, e a poupança do anual. */
export function annualBilling(plan: Plan): { total: number; saving: number } {
  const price = PLAN_PRICING[plan] ?? PLAN_PRICING.individual;
  const total = price.annual * 12;
  return { total, saving: price.monthly * 12 - total };
}
