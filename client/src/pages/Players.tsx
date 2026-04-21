import { Placeholder } from "./_Placeholder";

export default function Players() {
  return (
    <Placeholder
      title="Jogadores"
      subtitle="Roster da equipa"
      phase="F2"
      bullets={[
        "Cards com foto, número, posição, altura",
        "Filtros por posição e status (activo/inactivo)",
        "Adicionar/editar jogador com form",
        "Clique abre Player Detail (KPIs individuais)",
      ]}
    />
  );
}
