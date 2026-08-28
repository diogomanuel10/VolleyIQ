import { usePlanGuard } from "@/hooks/usePlanGuard";
import type { Team } from "@shared/schema";

interface ReportLetterheadProps {
  team: Team;
  /** Título do relatório (ex: "Relatório pós-jogo"). */
  title: string;
  /** Linha de contexto — adversário, data, jornada… */
  subtitle?: string;
}

/**
 * Cabeçalho de marca no topo dos relatórios impressos.
 *
 * Só aparece em `window.print()` (classe `print-only`). Em planos com
 * `customBranding` mostra o logótipo e a cor do clube; nos restantes cai para
 * um cabeçalho VolleyIQ neutro, que também serve de montra da funcionalidade
 * para quem receber o PDF.
 */
export function ReportLetterhead({ team, title, subtitle }: ReportLetterheadProps) {
  const { can } = usePlanGuard();
  const branded = can("customBranding");

  const accent = (branded && team.primaryColor) || "#0ea5e9";
  const printedAt = new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="print-only" style={{ marginBottom: "14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingBottom: "10px",
          borderBottom: `3px solid ${accent}`,
        }}
      >
        {branded && team.logoUrl && (
          <img
            src={team.logoUrl}
            alt=""
            style={{ height: "44px", width: "44px", objectFit: "contain" }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.2 }}>
            {branded ? team.club || team.name : "VolleyIQ"}
          </div>
          <div style={{ fontSize: "11px", color: "#4b5563", lineHeight: 1.3 }}>
            {[team.name, team.category, team.season].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div style={{ textAlign: "right", fontSize: "10px", color: "#4b5563" }}>
          <div style={{ fontWeight: 600, color: "#111827", fontSize: "12px" }}>{title}</div>
          {subtitle && <div>{subtitle}</div>}
          <div>{printedAt}</div>
        </div>
      </div>

      {!branded && (
        <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "4px" }}>
          Gerado com VolleyIQ · volleyiq.pt
        </div>
      )}
    </header>
  );
}
