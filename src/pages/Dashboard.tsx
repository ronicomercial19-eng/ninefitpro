import { CoachOverview } from "@/components/students/CoachOverview";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
export default function Dashboard() {
  return (
    <>
      <OnboardingTour />
      <CoachOverview />
    </>
  );
}
