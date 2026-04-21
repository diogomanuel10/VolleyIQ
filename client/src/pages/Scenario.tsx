import { Placeholder } from "./_Placeholder";

export default function Scenario() {
  return (
    <Placeholder
      title="Scenario Modeling"
      subtitle="Simular trocas e rotações iniciais"
      phase="F4"
      bullets={[
        "Drag-and-drop para alterar lineup ou rotação inicial",
        "Impacto projectado em Kill %, Side-Out %, Pass Rating, Block %",
        "Gráfico de barras comparando cenário actual vs. simulado",
        "Veredito IA (texto): substituição aceitável ou risco de performance",
      ]}
    />
  );
}
