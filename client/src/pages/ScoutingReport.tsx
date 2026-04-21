import { Placeholder } from "./_Placeholder";

export default function ScoutingReport() {
  return (
    <Placeholder
      title="Scouting Report"
      subtitle="Relatório automático do adversário"
      phase="F4"
      bullets={[
        "Perfil do adversário (jogos agregados)",
        "Padrões detectados pela IA com confidence 0–100%",
        "Zonas de serviço e distribuição de ataque (charts)",
        "Heatmap de vulnerabilidades por rotação",
        "Exportar PDF (F5)",
      ]}
    />
  );
}
