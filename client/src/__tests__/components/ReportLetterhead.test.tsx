import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportLetterhead } from "@/components/ReportLetterhead";
import type { Team } from "@shared/schema";

// O componente só depende do plano efectivo, que vem do usePlanGuard.
const can = vi.fn();
vi.mock("@/hooks/usePlanGuard", () => ({
  usePlanGuard: () => ({ can }),
}));

/** jsdom normaliza cores hex para `rgb(...)` ao ler style.borderBottom. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: "t1",
    name: "Seniores A",
    club: "CV Setúbal",
    category: "Seniores Femininas",
    season: "2025/26",
    division: null,
    primaryColor: "#e11d48",
    logoUrl: "https://cvsetubal.pt/logo.png",
    plan: "club",
    ownerUid: "u1",
    inviteCode: null,
    trialEndsAt: null,
    subscribedAt: null,
    easyPaySubscriptionId: null,
    pdfExportsCount: 0,
    pdfExportsMonth: "",
    featureOverrides: null,
    createdAt: new Date(),
    ...over,
  } as Team;
}

beforeEach(() => can.mockReset());

describe("ReportLetterhead com customBranding", () => {
  beforeEach(() => can.mockReturnValue(true));

  it("mostra o clube e o logótipo em vez da marca VolleyIQ", () => {
    render(<ReportLetterhead team={makeTeam()} title="Relatório pós-jogo" />);

    expect(screen.getByText("CV Setúbal")).toBeInTheDocument();
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "https://cvsetubal.pt/logo.png",
    );
    expect(screen.queryByText(/Gerado com VolleyIQ/)).not.toBeInTheDocument();
  });

  it("usa a cor do clube no filete do cabeçalho", () => {
    const { container } = render(
      <ReportLetterhead team={makeTeam()} title="Relatório pós-jogo" />,
    );
    const rule = container.querySelector("header > div") as HTMLElement;
    expect(rule.style.borderBottom).toContain(rgb("#e11d48"));
  });

  it("cai para a cor por omissão se o clube não tiver cor definida", () => {
    const { container } = render(
      <ReportLetterhead team={makeTeam({ primaryColor: null })} title="X" />,
    );
    const rule = container.querySelector("header > div") as HTMLElement;
    expect(rule.style.borderBottom).toContain(rgb("#0ea5e9"));
  });

  it("não renderiza <img> quando o clube não carregou logótipo", () => {
    const { container } = render(
      <ReportLetterhead team={makeTeam({ logoUrl: null })} title="X" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("CV Setúbal")).toBeInTheDocument();
  });

  it("cai para o nome da equipa se o clube estiver vazio", () => {
    render(<ReportLetterhead team={makeTeam({ club: "" })} title="X" />);
    expect(screen.getByText("Seniores A")).toBeInTheDocument();
  });
});

describe("ReportLetterhead sem customBranding", () => {
  beforeEach(() => can.mockReturnValue(false));

  it("mostra a marca VolleyIQ e ignora o logótipo do clube", () => {
    const { container } = render(
      <ReportLetterhead team={makeTeam()} title="Relatório pós-jogo" />,
    );

    expect(screen.getByText("VolleyIQ")).toBeInTheDocument();
    expect(screen.getByText(/Gerado com VolleyIQ/)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("CV Setúbal")).not.toBeInTheDocument();
  });

  it("ignora a cor do clube e usa a da plataforma", () => {
    const { container } = render(<ReportLetterhead team={makeTeam()} title="X" />);
    const rule = container.querySelector("header > div") as HTMLElement;
    expect(rule.style.borderBottom).toContain(rgb("#0ea5e9"));
    expect(rule.style.borderBottom).not.toContain(rgb("#e11d48"));
  });
});

describe("ReportLetterhead em qualquer plano", () => {
  it("só aparece na impressão", () => {
    can.mockReturnValue(true);
    const { container } = render(<ReportLetterhead team={makeTeam()} title="X" />);
    expect(container.querySelector("header")).toHaveClass("print-only");
  });

  it("mostra o título e o subtítulo do relatório", () => {
    can.mockReturnValue(true);
    render(
      <ReportLetterhead team={makeTeam()} title="Relatório de scouting" subtitle="vs. SC Braga" />,
    );
    expect(screen.getByText("Relatório de scouting")).toBeInTheDocument();
    expect(screen.getByText("vs. SC Braga")).toBeInTheDocument();
  });

  it("junta equipa, escalão e época na linha de contexto", () => {
    can.mockReturnValue(true);
    render(<ReportLetterhead team={makeTeam()} title="X" />);
    expect(
      screen.getByText("Seniores A · Seniores Femininas · 2025/26"),
    ).toBeInTheDocument();
  });

  it("omite os campos vazios da linha de contexto sem separadores soltos", () => {
    can.mockReturnValue(true);
    render(<ReportLetterhead team={makeTeam({ category: "", season: null })} title="X" />);
    expect(screen.getByText("Seniores A")).toBeInTheDocument();
  });
});
