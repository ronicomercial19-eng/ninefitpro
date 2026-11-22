import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "/src/components/layout/AppLayout";
import Dashboard from "/src/pages/Dashboard";
import "/src/index.css";
localStorage.setItem(
  "9fit:professor:tour:00000000-0000-4000-8000-000000000802",
  "true"
);
history.replaceState(null, "", "/app" + location.search);
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </BrowserRouter>
  </QueryClientProvider>
);
