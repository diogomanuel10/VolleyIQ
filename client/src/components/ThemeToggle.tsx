import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemeSetting } from "@/lib/theme";

const ORDER: ThemeSetting[] = ["light", "dark", "system"];
const LABELS: Record<ThemeSetting, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

/**
 * Botão que cicla entre light → dark → system. `system` segue automaticamente
 * o `prefers-color-scheme` do SO e actualiza em tempo real se o utilizador
 * mudar esse setting.
 */
export function ThemeToggle() {
  const { setting, theme, setTheme } = useTheme();

  function next() {
    const i = ORDER.indexOf(setting);
    setTheme(ORDER[(i + 1) % ORDER.length]);
  }

  const Icon =
    setting === "system" ? Monitor : theme === "dark" ? Moon : Sun;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={next}
      aria-label={LABELS[setting]}
      title={LABELS[setting]}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
