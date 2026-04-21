import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Plan {
  id: "basic" | "pro" | "club";
  name: string;
  price: string;
  period?: string;
  blurb: string;
  featured?: boolean;
  cta: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "Grátis",
    blurb: "Para experimentar o produto",
    cta: "Começar grátis",
    features: [
      "1 equipa",
      "Live scouting",
      "Métricas básicas",
      "Limite de 10 jogos",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€29",
    period: "/mês",
    blurb: "Para treinadores e clubes pequenos",
    cta: "Assinar Pro",
    featured: true,
    features: [
      "5 equipas",
      "Analytics completo",
      "AI pattern detection",
      "Relatórios PDF",
      "Scenario modeling",
      "Tagging de vídeo (roadmap)",
    ],
  },
  {
    id: "club",
    name: "Club",
    price: "€79",
    period: "/mês",
    blurb: "Para clubes com múltiplas equipas",
    cta: "Falar com vendas",
    features: [
      "Equipas ilimitadas",
      "Tudo do Pro",
      "Gestão de quotas e presenças",
      "Acesso API",
      "Suporte prioritário",
    ],
  },
];

export default function Pricing() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <Badge variant="outline" className="gap-1 mx-auto">
          <Sparkles className="h-3 w-3" /> Preços simples
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Escolhe o plano certo para a tua equipa
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Começa grátis. Actualiza quando precisares de analytics avançado, IA ou
          gestão de clube.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={cn(
              "relative flex flex-col",
              p.featured && "border-primary shadow-lg md:-translate-y-2",
            )}
          >
            {p.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>Mais popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                {p.period && (
                  <span className="text-muted-foreground text-sm">
                    {p.period}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-2 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={p.featured ? "default" : "outline"}
              >
                {p.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Billing real ainda não implementado — esta página é o mock do fluxo de
        checkout para a Fase 5.
      </p>
    </div>
  );
}
