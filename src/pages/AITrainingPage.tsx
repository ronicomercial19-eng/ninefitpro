import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { LegacyAIDrafts } from "@/components/students/LegacyAIDrafts";
export default function AITrainingPage() {
  return (
    <div className="space-y-5">
      <ProfessorPrescription />
      <LegacyAIDrafts />
    </div>
  );
}
