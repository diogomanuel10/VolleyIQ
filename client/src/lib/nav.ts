import {
  LayoutDashboard,
  Radio,
  Users,
  UsersRound,
  CalendarDays,
  FileText,
  Shuffle,
  Trophy,
  ClipboardCheck,
  Settings,
  Building2,
  LayoutPanelLeft,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import type { Plan } from "@shared/types";

/**
 * Fonte única da navegação da app. Sidebar (desktop) e MobileNav partilham
 * esta configuração — antes eram três listas mantidas à mão e já tinham
 * divergido (ex.: `athletes` vs `players` para a mesma rota).
 *
 * Os itens estão agrupados por momento de utilização: o que se faz à volta
 * do jogo, o que se analisa depois, e a gestão da equipa.
 */

export interface NavItem {
  href: string;
  icon: LucideIcon;
  /** Chave em `nav.*` nos ficheiros de tradução. */
  key: string;
  /** Plano mínimo necessário para o item aparecer. */
  minPlan?: Plan;
  /** Só visível no menu mobile (o desktop tem estes acessos no TopBar). */
  mobileOnly?: boolean;
}

export interface NavGroup {
  /** Chave em `navGroups.*`. `null` = itens soltos no topo, sem cabeçalho. */
  key: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: null,
    items: [{ href: "/", icon: LayoutDashboard, key: "dashboard" }],
  },
  {
    key: "game",
    items: [
      { href: "/scout", icon: Radio, key: "liveScout" },
      { href: "/matches", icon: Trophy, key: "matches" },
      { href: "/matchday", icon: ClipboardCheck, key: "matchDay" },
    ],
  },
  {
    key: "analysis",
    items: [
      { href: "/post-match", icon: CalendarDays, key: "postMatch" },
      { href: "/reports", icon: FileText, key: "scoutingReport" },
      { href: "/scenario", icon: Shuffle, key: "scenario" },
      { href: "/boards", icon: LayoutPanelLeft, key: "boards" },
    ],
  },
  {
    key: "team",
    items: [
      { href: "/players", icon: Users, key: "players" },
      { href: "/opponents", icon: UsersRound, key: "opponents" },
      { href: "/club", icon: Building2, key: "clubDashboard", minPlan: "club" },
      { href: "/settings", icon: Settings, key: "settings" },
      { href: "/profile", icon: UserCircle, key: "profile", mobileOnly: true },
    ],
  },
];

/** Itens da bottom tab bar em mobile — os cinco acessos mais frequentes. */
export const MOBILE_PRIMARY: NavItem[] = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" },
  { href: "/scout", icon: Radio, key: "liveScout" },
  { href: "/matches", icon: Trophy, key: "matches" },
  { href: "/players", icon: Users, key: "players" },
  { href: "/post-match", icon: CalendarDays, key: "postMatch" },
];

/** Grupos filtrados pelo plano da equipa e pelo contexto (desktop/mobile). */
export function useNavGroups(opts: { mobile?: boolean } = {}): NavGroup[] {
  const guard = usePlanGuard();
  return NAV_GROUPS.map((group) => ({
    key: group.key,
    items: group.items.filter(
      (it) =>
        (!it.minPlan || guard.meetsMinimum(it.minPlan)) &&
        (opts.mobile || !it.mobileOnly),
    ),
  })).filter((group) => group.items.length > 0);
}

/** Um href está activo para a localização actual? */
export function isNavItemActive(href: string, location: string): boolean {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(href + "/");
}
