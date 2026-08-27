import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isNavItemActive, useNavGroups, MOBILE_PRIMARY } from "@/lib/nav";

export function MobileNav() {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const groups = useNavGroups({ mobile: true });

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-6">
          {MOBILE_PRIMARY.map((it) => {
            const active = isNavItemActive(it.href, location);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <it.icon className="h-5 w-5" />
                  {t(`nav.${it.key}`)}
                </Link>
              </li>
            );
          })}
          {/* "More" button */}
          <li>
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
              {t("nav.more")}
            </button>
          </li>
        </ul>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Drawer panel */}
          <div
            className="absolute bottom-0 inset-x-0 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card flex items-center justify-between px-4 pt-4 pb-2 border-b">
              <span className="font-semibold text-sm">Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* All options, grouped */}
            <div className="p-3 pb-8 space-y-3">
              {groups.map((group, gi) => (
                <div key={group.key ?? `top-${gi}`}>
                  {group.key && (
                    <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {t(`navGroups.${group.key}`)}
                    </div>
                  )}
                  <ul className="space-y-0.5">
                    {group.items.map((it) => {
                      const active = isNavItemActive(it.href, location);
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            onClick={() => setDrawerOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors",
                              active
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            <it.icon className="h-5 w-5 shrink-0" />
                            {t(`nav.${it.key}`)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
