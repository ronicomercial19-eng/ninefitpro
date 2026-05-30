import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { OSDashboard } from "@/components/9fit/OSDashboard";
import { RonBubble } from "@/components/9fit/RonBubble";

export default function NineFitOS() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <OSDashboard />
      <RonBubble />
      <BottomNavigation />
    </div>
  );
}
