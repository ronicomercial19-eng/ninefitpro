
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileValidationAlertProps {
  discrepancies: string[];
  onDismiss: () => void;
}

export const ProfileValidationAlert = ({ discrepancies, onDismiss }: ProfileValidationAlertProps) => {
  const navigate = useNavigate();

  if (discrepancies.length === 0) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-6">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="space-y-2">
          <p className="font-semibold">Divergências encontradas no seu perfil:</p>
          <ul className="list-disc pl-5 space-y-1">
            {discrepancies.map((item, index) => (
              <li key={index} className="text-sm">{item}</li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              onClick={() => navigate('/assessment')}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Revisar Questionário
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDismiss}
            >
              Consultar Professor
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
