import { Placeholder } from "./_Placeholder";

export default function Matches() {
  return (
    <Placeholder
      title="Jogos"
      subtitle="Todos os jogos da temporada"
      phase="F2"
      bullets={[
        "Lista com adversário, data, local, resultado, competição",
        "Filtros por status (agendado / live / terminado) e competição",
        "Criar jogo com form (adversário, data, venue, competição)",
        "Entrar no jogo abre Live Scout, Match Day ou Post-Match",
      ]}
    />
  );
}
