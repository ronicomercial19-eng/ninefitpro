import { useAthleteId } from '@/hooks/useAthleteId';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { GuidedAssessmentForm } from '@/components/progress/GuidedAssessmentForm';
export default function NineFitAvaliacaoGuiada() {
 const { athleteId, loading, error } = useAthleteId();
 return <><GuidedAssessmentForm athleteId={athleteId} loading={loading} athleteError={error}/><BottomNavigation/></>;
}
