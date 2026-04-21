import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Activity,
  Award,
  Swords,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendChart } from "@/components/charts/TrendChart";
import { TeamRadar } from "@/components/charts/TeamRadar";
import { RotationSideOut } from "@/components/charts/RotationSideOut";
import { cn, formatPct } from "@/lib/utils";

// ── Mock data (F1) — substituído por dados reais em F3 ──────────────────
const kpis = [
  { label: "Kill %", value: 46.2, delta: +2.1, icon: Target },
  { label: "Side-Out %", value: 63.4, delta: +1.4, icon: Shield },
  { label: "Pass Rating", value: 2.31, delta: +0.08, icon: Activity, unit: "" },
  { label: "Serve Ace %", value: 8.7, delta: -0.5, icon: Swords },
  { label: "Record", value: "12-4", delta: 0, icon: Award, unit: "", plain: true },
  { label: "Attack Eff.", value: 0.291, delta: +0.02, icon: Sparkles, unit: "" },
];

const trend = [
  { label: "J-6", killPct: 41.0, sideOut: 58 },
  { label: "J-5", killPct: 43.2, sideOut: 60 },
  { label: "J-4", killPct: 44.0, sideOut: 61 },
  { label: "J-3", killPct: 45.8, sideOut: 62 },
  { label: "J-2", killPct: 44.2, sideOut: 65 },
  { label: "J-1", killPct: 46.2, sideOut: 63 },
];

const radar = [
  { axis: "Attack", value: 78 },
  { axis: "Serve", value: 64 },
  { axis: "Reception", value: 72 },
  { axis: "Block", value: 58 },
  { axis: "Dig", value: 70 },
  { axis: "Setting", value: 81 },
];

const rotation = [
  { rotation: "R1", pct: 68 },
  { rotation: "R2", pct: 61 },
  { rotation: "R3", pct: 55 },
  { rotation: "R4", pct: 72 },
  { rotation: "R5", pct: 47 },
  { rotation: "R6", pct: 64 },
];

export default function Dashboard() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Vista-resumo das últimas 6 jornadas · VolleyIQ FC · Liga
          </p>
        </div>
        <Badge variant="success" className="gap-1">
          <TrendingUp className="h-3 w-3" /> Em boa forma
        </Badge>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, idx) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <k.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {k.plain
                    ? k.value
                    : typeof k.value === "number"
                      ? k.unit === ""
                        ? k.value.toFixed(k.label === "Pass Rating" ? 2 : 3)
                        : formatPct(k.value)
                      : k.value}
                </div>
                {!k.plain && (
                  <div
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-xs",
                      k.delta > 0
                        ? "text-emerald-600"
                        : k.delta < 0
                          ? "text-red-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {k.delta > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : k.delta < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {k.delta > 0 ? "+" : ""}
                    {k.delta}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tendência — últimas 6 jornadas</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Perfil da equipa</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamRadar data={radar} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Side-Out % por rotação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rotações a vermelho precisam de atenção; verdes são o teu ponto forte.
          </p>
        </CardHeader>
        <CardContent>
          <RotationSideOut data={rotation} />
        </CardContent>
      </Card>
    </div>
  );
}
