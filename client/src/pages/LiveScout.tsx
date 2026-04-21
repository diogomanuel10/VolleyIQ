import { Placeholder } from "./_Placeholder";

export default function LiveScout() {
  return (
    <Placeholder
      title="Live Scout"
      subtitle="Scouting táctil em tempo real"
      phase="F3"
      bullets={[
        "Grid dos 6 jogadores em campo — toque para seleccionar",
        "6 tipos de acção: serve, reception, set, attack, block, dig",
        "Mapa do campo com 9 zonas para destino da bola",
        "Botões de resultado coloridos (kill, error, ace, tooled…)",
        "Input de score + mudança de set; log com Undo",
      ]}
    />
  );
}
