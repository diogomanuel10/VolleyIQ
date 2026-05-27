import { lazy, Suspense } from "react";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { AppShell } from "@/components/layout/AppShell";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const LiveScout = lazy(() => import("@/pages/LiveScout"));
const Matches = lazy(() => import("@/pages/Matches"));
const Players = lazy(() => import("@/pages/Players"));
const PlayerDetail = lazy(() => import("@/pages/PlayerDetail"));
const MatchDay = lazy(() => import("@/pages/MatchDay"));
const ScoutingReport = lazy(() => import("@/pages/ScoutingReport"));
const Scenario = lazy(() => import("@/pages/Scenario"));
const PostMatch = lazy(() => import("@/pages/PostMatch"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const SecondScreen = lazy(() => import("@/pages/SecondScreen"));
const Login = lazy(() => import("@/pages/Login"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Opponents = lazy(() => import("@/pages/Opponents"));
const OpponentDetail = lazy(() => import("@/pages/OpponentDetail"));
const TeamSettings = lazy(() => import("@/pages/TeamSettings"));
const Profile = lazy(() => import("@/pages/Profile"));
const ClubDashboard = lazy(() => import("@/pages/ClubDashboard"));
const ApiKeysPage = lazy(() => import("@/pages/ApiKeysPage"));
const WebhooksPage = lazy(() => import("@/pages/WebhooksPage"));
const ApiDocsPage = lazy(() => import("@/pages/ApiDocsPage"));
const GettingStartedPage = lazy(() => import("@/pages/GettingStartedPage"));
const Admin = lazy(() => import("@/pages/Admin"));
const Boards = lazy(() => import("@/pages/Boards"));
const BoardEditor = lazy(() => import("@/pages/BoardEditor"));

export default function App() {
  const { isAuthed, isLoading: authLoading } = useAuth();

  // Public routes — accessible without authentication
  const hash = window.location.hash;
  if (hash === "#/docs/api" || hash.startsWith("#/docs/api?")) {
    return (
      <WouterRouter hook={useHashLocation}>
        <Suspense fallback={<Loading />}>
          <ApiDocsPage />
        </Suspense>
      </WouterRouter>
    );
  }

  if (authLoading) return <Loading />;

  if (!isAuthed) {
    return (
      <WouterRouter hook={useHashLocation}>
        <Suspense fallback={<Loading />}>
          <Login />
        </Suspense>
      </WouterRouter>
    );
  }

  return <AuthedApp />;
}

function AuthedApp() {
  const { hasTeams, isLoading: teamsLoading } = useTeam();

  if (teamsLoading) return <Loading />;

  if (!hasTeams) {
    return (
      <WouterRouter hook={useHashLocation}>
        <Suspense fallback={<Loading />}>
          <Onboarding />
        </Suspense>
      </WouterRouter>
    );
  }

  return (
    <WouterRouter hook={useHashLocation}>
      <AppShell>
        <Suspense fallback={<Loading />}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/scout/:matchId?" component={LiveScout} />
            <Route path="/matches" component={Matches} />
            <Route path="/players" component={Players} />
            <Route path="/players/:id" component={PlayerDetail} />
            <Route path="/opponents" component={Opponents} />
            <Route path="/opponents/:id" component={OpponentDetail} />
            <Route path="/matchday/:matchId?" component={MatchDay} />
            <Route path="/reports/:opponent?" component={ScoutingReport} />
            <Route path="/scenario" component={Scenario} />
            <Route path="/post-match/:matchId?" component={PostMatch} />
            <Route path="/second-screen/:matchId" component={SecondScreen} />
            <Route path="/club" component={ClubDashboard} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/settings" component={TeamSettings} />
            <Route path="/settings/api-keys" component={ApiKeysPage} />
            <Route path="/settings/webhooks" component={WebhooksPage} />
            <Route path="/profile" component={Profile} />
            <Route path="/getting-started" component={GettingStartedPage} />
            <Route path="/docs/api" component={ApiDocsPage} />
            <Route path="/boards" component={Boards} />
            <Route path="/boards/:id" component={BoardEditor} />
            <Route path="/admin" component={Admin} />
            <Route>
              <div className="p-8 text-muted-foreground">Página não encontrada.</div>
            </Route>
          </Switch>
        </Suspense>
      </AppShell>
    </WouterRouter>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      A carregar…
    </div>
  );
}
