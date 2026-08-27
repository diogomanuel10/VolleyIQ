import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/lib/sidebar";
import { TeamSwitcher } from "./TeamSwitcher";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isNavItemActive, useNavGroups } from "@/lib/nav";

export function Sidebar() {
  const [location] = useLocation();
  const { collapsed } = useSidebarCollapsed();
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();
  const groups = useNavGroups();

  // Expande se não estiver collapsed (pin) OU se estiver em hover
  const expanded = !collapsed || hovered;

  function handleMouseEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  }

  function handleMouseLeave() {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r bg-card transition-[width] duration-200 z-30 sticky top-0 h-screen",
        expanded ? "w-60" : "w-16",
      )}
    >
      <div
        className={cn(
          "border-b space-y-3",
          expanded ? "p-4" : "p-2",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            !expanded && "justify-center",
          )}
        >
          <img
            src="/logo.svg"
            alt="VolleyIQ"
            className="h-8 w-8 shrink-0"
          />
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">VolleyIQ</div>
              <div className="text-[11px] text-muted-foreground">
                Analytics Platform
              </div>
            </div>
          )}
        </div>
        <TeamSwitcher collapsed={!expanded} />
      </div>
      <nav
        className={cn(
          "flex-1 overflow-y-auto",
          expanded ? "p-2 space-y-3" : "p-1.5 space-y-2",
        )}
      >
        {groups.map((group, gi) => (
          <div key={group.key ?? `top-${gi}`} className="space-y-0.5">
            {group.key &&
              (expanded ? (
                <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t(`navGroups.${group.key}`)}
                </div>
              ) : (
                <div className="mx-auto my-1.5 h-px w-6 bg-border" />
              ))}
            {group.items.map((it) => {
              const label = t(`nav.${it.key}`);
              const active = isNavItemActive(it.href, location);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={!expanded ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-md text-sm transition-colors",
                    !expanded
                      ? "justify-center h-10 w-full"
                      : "gap-3 px-3 py-2",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <it.icon className="h-4 w-4 shrink-0" />
                  {expanded && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
