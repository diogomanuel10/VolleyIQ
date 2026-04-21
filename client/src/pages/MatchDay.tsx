import { Placeholder } from "./_Placeholder";

export default function MatchDay() {
  return (
    <Placeholder
      title="Match Day"
      subtitle="Checklist de dia de jogo"
      phase="F4"
      bullets={[
        "11 items agrupados em Lineup / Scouting / Tactical / Logistics",
        "Barra de readiness (verde quando 100%)",
        "Persistência por jogo (toggle grava em /api/checklist/:id)",
        "Atalhos para Live Scout e Scouting Report do adversário",
      ]}
    />
  );
}
