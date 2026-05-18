import { Link } from "wouter";
import { Lock } from "lucide-react";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { PLAN_LABELS, PLAN_UPGRADE_LABEL } from "@shared/planFeatures";
import type { PlanLimits } from "@shared/planFeatures";
import type { Plan } from "@shared/types";

interface PlanGateProps {
  feature?: keyof PlanLimits;
  minimumPlan?: Plan;
  children: React.ReactNode;
  /** Mostrar o conteúdo bloqueado mas com overlay, em vez de esconder */
  overlay?: boolean;
}

export function PlanGate({ feature, minimumPlan, children, overlay = false }: PlanGateProps) {
  const { can, meetsMinimum, plan } = usePlanGuard();

  const allowed = feature ? can(feature) : minimumPlan ? meetsMinimum(minimumPlan) : true;

  if (allowed) return <>{children}</>;

  const requiredPlan: Plan = minimumPlan ?? (feature === "aiTrainingPlans" || feature === "clubDashboard" ? "club" : "pro");
  const upgradeLabel = PLAN_UPGRADE_LABEL[plan];

  const lockBadge = (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          Disponível no plano {PLAN_LABELS[requiredPlan]}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          O teu plano atual é {PLAN_LABELS[plan]}
        </p>
      </div>
      {upgradeLabel && (
        <Link href="/pricing">
          <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 transition-colors">
            {upgradeLabel}
          </button>
        </Link>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-30 blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
          {lockBadge}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      {lockBadge}
    </div>
  );
}
