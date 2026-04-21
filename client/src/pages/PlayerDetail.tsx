import { Placeholder } from "./_Placeholder";

export default function PlayerDetail() {
  return (
    <Placeholder
      title="Player Detail"
      subtitle="Vista individual do atleta"
      phase="F3"
      bullets={[
        "KPIs por tipo de acção (Kill %, Pass Rating, Block pts…)",
        "Evolução ao longo da época (line chart)",
        "Heatmap de zonas de ataque e serviço",
        "Recomendações de treino geradas por IA (prioridade H/M/L)",
      ]}
    />
  );
}
