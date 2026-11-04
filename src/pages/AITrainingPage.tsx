import { Navigate, useLocation } from "react-router-dom";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { LegacyAIDrafts } from "@/components/students/LegacyAIDrafts";
export function AITrainingWorkspace() {
  return (
    <div className="space-y-5">
      <ProfessorPrescription />
      <LegacyAIDrafts />
    </div>
  );
}

export default function AITrainingPage() {
  const location = useLocation();
  return <Navigate replace to={{ pathname: "/app/assistente-ia", search: location.search, hash: location.hash }} />;
}
