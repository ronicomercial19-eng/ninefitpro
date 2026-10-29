import { TrainingSetupInbox } from "@/components/students/TrainingSetupInbox";
import { CoachReadinessInbox } from '@/components/students/CoachReadinessInbox';
import { CoachOverview } from "@/components/students/CoachOverview";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
export default function Dashboard() {
  return (
    <>
      <OnboardingTour />
      <CoachOverview />
      <CoachReadinessInbox />
      <TrainingSetupInbox />
    </>
  );
}
