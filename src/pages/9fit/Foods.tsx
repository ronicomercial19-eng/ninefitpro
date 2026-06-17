import { BottomNavigation } from "@/components/9fit/BottomNavigation";

/**
 * Foods — embed do app ninefoods (PROMPT 3).
 * Iframe ocupa viewport completo abaixo da TopBar e acima da BottomNavigation.
 */
export default function NineFitFoods() {
  return (
    <div className="min-h-screen" style={{ background: "#090909" }}>
      <iframe
        src="https://ninefoodss.lovable.app"
        title="9Foods"
        allow="fullscreen; clipboard-read; clipboard-write"
        style={{
          width: "100%",
          height: "calc(100vh - 56px - 76px)", // TopBar + BottomNav
          border: "none",
          background: "#090909",
          display: "block",
        }}
      />
      <BottomNavigation />
    </div>
  );
}
