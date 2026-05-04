import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function K({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded border bg-muted text-[11px] font-mono">
      {children}
    </kbd>
  );
}

const SECTIONS: Array<{ title: string; rows: Array<[React.ReactNode, string]> }> = [
  {
    title: "Sempre",
    rows: [
      [
        <>
          <K>Ctrl</K>+<K>Z</K> ou <K>⌫</K>
        </>,
        "Anular última acção",
      ],
      [<K>Esc</K>, "Cancelar selecção em curso"],
      [<K>?</K>, "Mostrar/ocultar este painel"],
    ],
  },
  {
    title: "Escolher jogadora",
    rows: [
      [
        <>
          <K>0</K>–<K>9</K>
        </>,
        "Digita o nº de camisola (até 2 dígitos)",
      ],
    ],
  },
  {
    title: "Escolher acção",
    rows: [
      [<K>1</K>, "Serviço"],
      [<K>2</K>, "Recepção"],
      [<K>3</K>, "Distribuição"],
      [<K>4</K>, "Ataque"],
      [<K>5</K>, "Bloco"],
      [<K>6</K>, "Defesa"],
    ],
  },
  {
    title: "Escolher zona (1–9)",
    rows: [
      [
        <>
          <K>1</K>…<K>9</K>
        </>,
        "Zona DataVolley (origem ou destino conforme passo)",
      ],
      [<K>Space</K>, "Saltar zona (modo Lite)"],
    ],
  },
  {
    title: "Resultado",
    rows: [
      [<K>#</K>, "Perfeito / kill / ace / stuff"],
      [<K>+</K>, "Bom / em jogo positivo"],
      [<K>-</K>, "Fraco / bloqueado"],
      [<K>/</K>, "Tooled (ataque toca no bloco)"],
      [<K>!</K>, "Em jogo (neutro)"],
      [<K>=</K>, "Erro"],
    ],
  },
];

export function KeyboardHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Atalhos de teclado
          </DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {sec.title}
              </div>
              <ul className="space-y-1">
                {sec.rows.map(([keys, label], i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-1">{keys}</span>
                    <span className="text-muted-foreground text-xs text-right">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground pt-2">
          Os atalhos respeitam o passo actual: o mesmo número selecciona
          jogadora, acção ou zona consoante o que estiveres a registar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
