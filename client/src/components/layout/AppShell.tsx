import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { TrialBanner } from "@/components/TrialBanner";
import { TrialExpiredGate } from "@/components/TrialExpiredGate";
import { DataChat } from "@/components/DataChat";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useTeam } from "@/hooks/useTeam";
import { usePlanGuard } from "@/hooks/usePlanGuard";

export function AppShell({ children }: { children: ReactNode }) {
  const { team } = useTeam();
  const guard = usePlanGuard();

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="print-hide contents">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="print-hide sticky top-0 z-20 shrink-0">
          <TrialBanner />
          <TopBar />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0 print-area min-h-0">
          <TrialExpiredGate>
            {children}
          </TrialExpiredGate>
        </main>
        <div className="print-hide">
          <MobileNav />
        </div>
      </div>
      {team && (
        <div className="print-hide">
          <DataChat teamId={team.id} isPro={guard.meetsMinimum("pro")} />
        </div>
      )}
      <div className="print-hide">
        <InstallPrompt />
      </div>
    </div>
  );
}
