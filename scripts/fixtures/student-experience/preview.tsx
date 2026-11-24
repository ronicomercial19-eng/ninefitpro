import "/src/styles/responsive-viewport.css";
import { installResponsiveViewport } from "/src/lib/responsiveViewport";
import Modules from "/src/pages/9fit/Modules";
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HeroSyncSection } from "/src/components/9fit/HeroSyncSection";
import { HubQuickRecords } from "/src/components/9fit/HubQuickRecords";
import { FitOSConsoleDock } from "/src/components/9fit/FitOSConsoleDock";
import { WorkoutHome } from "/src/components/9fit/WorkoutHome";
import { ReadinessCard } from "/src/components/9fit/ReadinessCard";
import { useState } from "react";
import { OSDashboard } from "/src/components/9fit/OSDashboard";
import { BottomNavigation } from "/src/components/9fit/BottomNavigation";
import { businessDate } from "/src/services/dailyContextRules";
import "/src/index.css";
import "/src/styles/orange-palette.css";
import "/src/styles/touch-feedback.css";
import "/src/styles/experience-theme.css";
import "/src/styles/brand-nine.css";
document.documentElement.classList.add("dark");
document.documentElement.dataset.ninefitSurface = "student";

const Hub = React.lazy(() => import("/src/pages/9fit/Hub"));
const Train = React.lazy(() => import("/src/pages/9fit/Train"));
const Profile = React.lazy(() => import("/src/pages/9fit/Profile"));
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
const user = "00000000-0000-4000-8000-000000000002";
const context = {
  version: 1,
  status: "ready",
  date: businessDate(),
  generated_at: new Date().toISOString(),
  profile: {
    complete: true,
    declared: {},
    preferences: {},
    observed: {
      active_days_30d: 3,
      completed_workouts_30d: 2,
      training_windows: [],
    },
    inferred: {},
  },
  calibration: { complete: false },
  safety: { review_required: false, is_medical_clearance: false },
  today: {
    workout_completed: false,
    workout_in_progress: false,
    workout_scheduled: true,
    rest_day: false,
    meals: 1,
    water_ml: 750,
    review: null,
  },
  sync: {
    value: 72,
    readiness: 72,
    record_coverage: 2,
    coverage_dimensions: {},
    formula: "",
    source: "",
    is_medical_clearance: false,
  },
  streak: 2,
};
client.setQueryData(["daily-context", user], context);
client.setQueryData(["current-athlete", user], {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Marina Silva",
});
client.setQueryData(
  ["daily-readiness", user, "00000000-0000-4000-8000-000000000001"],
  {
    preferences: { enabled: true, pdi_confirmed_at: "2026-11-01" },
    decision: {
      id: "qa",
      decision_date: businessDate(),
      status: "shadow",
      mode: "low",
      volume_pct_total: -10,
      volume_pct_applied: 0,
      base_sets: 10,
      applied_sets: 10,
      rest_delta_s: 0,
      warmup_add_min: 0,
      gate_level: 0,
      flags: [],
      inputs: { sleep: 2, energy: 2 },
      reasons: [{ signal: "sleep", answer: 2, volume_pct: -5 }],
      applied_workout_id: null,
      rule_set_version: "qa",
    },
  }
);
const assignment = {
  id: "workout",
  training_name: "Treino A · Corpo inteiro",
  start_date: businessDate(),
  is_active: true,
  training_data: {
    estimated_duration: 35,
    exercises: [{ name: "Agachamento", sets: 3, reps: "10" }],
  },
};
const bd = { treino: 50, nutri: 40, sono: null, mob: null, hidr: 30 };
function HubFixture() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <h1 className="text-2xl">Sua rotina ganha forma.</h1>
      <HeroSyncSection
        name="Marina"
        syncScore={72}
        scoreStatus="available"
        breakdown={bd}
        onDiagnosis={() => (window.qaDiagnosis = true)}
      />
      <HubQuickRecords
        athleteId="00000000-0000-4000-8000-000000000001"
        userId={user}
      />
      <FitOSConsoleDock
        weekly={{ treinos: 2, nutri: 4, minutos: 78 }}
        scoreStatus="available"
        invalidateUserState={() => {}}
        performancePlanTitle="Seu plano de força"
        cycleStatus="active"
        libraryStatus="ready"
        protocolCount={1}
        breakdown={bd}
      />
    </div>
  );
}
function TrainFixture() {
  const [mode, setMode] = useState("ready");
  window.qaTrain = setMode;
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4">
      <ReadinessCard compact athleteId="00000000-0000-4000-8000-000000000001" />
      <WorkoutHome
        trainings={
          mode === "empty"
            ? []
            : mode === "template"
            ? [{ ...assignment, training_data: { exercise_count: 4 } }]
            : [assignment]
        }
        athleteName="Marina"
        completedCount={12}
        weeklyCompleted={2}
        onSelectWorkout={() => {
          window.qaSelected = true;
        }}
        onStartQuick={() => {
          window.qaQuick = true;
        }}
      />
    </div>
  );
}
client.setQueryData(["athlete-profile-state", user], {
  totalXp: 1250,
  level: 2,
  streak: 3,
  weightKg: 72,
  syncScore: 99,
});
client.setQueryData(["my-onboardings", user], {
  athlete_id: "00000000-0000-4000-8000-000000000001",
  current: null,
  stages: [],
});
client.setQueryData(
  [
    "sync-display",
    user,
    "00000000-0000-4000-8000-000000000001",
    businessDate(),
  ],
  { context, routine: { value: 72, markers: [], base: 57, recordPoints: 15 } }
);
window.qaReadiness = (value) => client.setQueryData(["daily-readiness", user, "00000000-0000-4000-8000-000000000001"], value);
window.qaContext = (patch) =>
  client.setQueryData(["daily-context", user], { ...context, ...patch });
installResponsiveViewport();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <React.Suspense fallback={<p>Carregando fixture…</p>}>
        <main className="dark fit-os-grid min-h-screen bg-background pb-28 text-foreground">
          {new URLSearchParams(location.search).get("screen") ===
          "modules" ? <Modules /> : new URLSearchParams(location.search).get("screen") === "hub-route" ? (
            <Hub />
          ) : new URLSearchParams(location.search).get("screen") ===
            "train-route" ? (
            <Train />
          ) : new URLSearchParams(location.search).get("screen") ===
            "profile" ? (
            <Profile />
          ) : new URLSearchParams(location.search).get("screen") === "hub" ? (
            <HubFixture />
          ) : new URLSearchParams(location.search).get("screen") === "train" ? (
            <TrainFixture />
          ) : (
            <OSDashboard
              name="Marina"
              syncScore={72}
              scoreStatus="available"
              weekly={{ treinos: 2, nutri: 4, minutos: 78 }}
              cycleStatus="active"
            />
          )}
          <BottomNavigation />
        </main>
      </React.Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);
