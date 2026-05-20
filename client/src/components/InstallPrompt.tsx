import { useState, useEffect } from "react";
import { Share, X } from "lucide-react";

const DISMISSED_KEY = "volleyiq:install-prompt-dismissed";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    ("standalone" in navigator && (navigator as any).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only on iOS Safari, not already installed, not dismissed
    if (!isIOS()) return;
    if (isInStandaloneMode()) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch { /* ignore */ }
    // Small delay so it doesn't flash immediately on page load
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* ignore */ }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 lg:left-auto lg:right-6 lg:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border bg-card shadow-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" className="w-10 h-10 rounded-xl shrink-0" alt="VolleyIQ" />
            <div>
              <p className="font-semibold text-sm">Instalar VolleyIQ</p>
              <p className="text-xs text-muted-foreground">Adicionar ao ecrã inicial</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0 text-foreground">1</span>
            Toca em{" "}
            <Share className="h-3.5 w-3.5 inline text-blue-500 shrink-0" />{" "}
            <span className="text-foreground font-medium">"Partilhar"</span>{" "}
            no Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0 text-foreground">2</span>
            Escolhe{" "}
            <span className="text-foreground font-medium">"Adicionar ao Ecrã Inicial"</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0 text-foreground">3</span>
            Abre a app instalada e ativa as notificações
          </li>
        </ol>
      </div>
    </div>
  );
}
