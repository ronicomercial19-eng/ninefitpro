import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mirrorEvent } from "@/services/intelligenceHub.service";

const PORTAL_URL = "https://ninelogin.lovable.app";
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/9fit/login",
  "/9fit",
  "/9fit/onboarding",
  "/9fit/first-access",
  "/sales",
  "/suporte",
  "/whatsapp-redirect",
  "/assessment",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#E5E5E5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: "'Syne', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid #2A2A2A",
          borderTopColor: "#E8571A",
          borderRadius: "50%",
          animation: "ninefit-spin 0.9s linear infinite",
        }}
      />
      <p
        style={{
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: 14,
          color: "#E8571A",
        }}
      >
        {text}
      </p>
      <style>{`@keyframes ninefit-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function SovereignBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState("Validando acesso ao Ecossistema 9FIT...");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const userId = params.get("user_id");

        // MODO SOBERANO: tokens vindos do portal central
        if (accessToken && refreshToken) {
          setStatusText("Estabelecendo sessão soberana...");
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.warn("[Sovereign] setSession falhou:", error.message);
            } else {
              localStorage.setItem("ninefit_token", accessToken);
              if (userId) localStorage.setItem("ninefit_user_id", userId);
              mirrorEvent("login", { mode: "sovereign" });
            }
          } catch (e) {
            console.warn("[Sovereign] setSession exception:", e);
          }

          // Limpar URL sempre, mesmo em falha (evita exposição do token)
          window.history.replaceState({}, "", window.location.pathname);
          if (!cancelled) setReady(true);
          return;
        }

        // MODO LEGADO: verificar sessão existente
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          if (!cancelled) setReady(true);
          return;
        }

        // Sem sessão: rota pública → segue normal (mostra login legado)
        if (isPublicRoute(window.location.pathname)) {
          if (!cancelled) setReady(true);
          return;
        }

        // Rota protegida sem sessão → redireciona para portal (com anti-loop)
        const lastAttempt = Number(sessionStorage.getItem("ninefit_redirect_attempted") || "0");
        const now = Date.now();
        if (now - lastAttempt < 5000) {
          console.warn("[Sovereign] redirect loop bloqueado, fallback para login local");
          if (!cancelled) setReady(true);
          return;
        }
        sessionStorage.setItem("ninefit_redirect_attempted", String(now));
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `${PORTAL_URL}?return_to=${returnTo}`;
      } catch (err) {
        console.error("[Sovereign] bootstrap error:", err);
        if (!cancelled) setReady(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <LoadingScreen text={statusText} />;
  return <>{children}</>;
}
