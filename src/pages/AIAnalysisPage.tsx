import { Navigate, useLocation } from "react-router-dom";
export default function AIAnalysisPage() {
  const location = useLocation();
  return <Navigate replace to={{ pathname: "/app/fit-copilot", search: location.search, hash: location.hash }} />;
}
