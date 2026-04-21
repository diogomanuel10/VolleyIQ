import { Placeholder } from "./_Placeholder";

export default function PostMatch() {
  return (
    <Placeholder
      title="Post-Match"
      subtitle="Resumo pós-jogo focado no atleta"
      phase="F4"
      bullets={[
        "Resultados por set e rating individual",
        "Destaques (3 melhores acções)",
        "Gráfico de ataques por set",
        "Export/partilha em PDF (F5)",
      ]}
    />
  );
}
