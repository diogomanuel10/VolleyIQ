import { useTeam } from "@/hooks/useTeam";
import { PLAN_FEATURES, planMeetsMinimum, parseFeatureOverrides, planHasFeature } from "@shared/planFeatures";
import type { Plan } from "@shared/types";
import type { PlanLimits } from "@shared/planFeatures";

export function usePlanGuard() {
  const { team, isSubscribed, isTrialExpired } = useTeam();
  const onTrial = !isSubscribed && !isTrialExpired && Boolean(team);
  const rawPlan = team?.plan ?? "individual";
  const plan: Plan = onTrial
    ? "club"
    : (rawPlan in PLAN_FEATURES ? (rawPlan as Plan) : "individual");
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES["individual"];
  const overrides = parseFeatureOverrides((team as any)?.featureOverrides);

  function can(feature: keyof PlanLimits): boolean {
    return planHasFeature(plan, feature, overrides);
  }

  function meetsMinimum(minimum: Plan): boolean {
    return planMeetsMinimum(plan, minimum);
  }

  return { plan, features, can, meetsMinimum };
}
