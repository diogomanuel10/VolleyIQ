import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Radio,
  Trophy,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", icon: LayoutDashboard, label: "Dash" },
  { href: "/scout", icon: Radio, label: "Scout" },
  { href: "/matches", icon: Trophy, label: "Jogos" },
  { href: "/players", icon: Users, label: "Atletas" },
  { href: "/matchday", icon: ClipboardCheck, label: "Match Day" },
];

export function MobileNav() {
  const [location] = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-card/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active =
            it.href === "/"
              ? location === "/"
              : location === it.href || location.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <it.icon className="h-5 w-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
