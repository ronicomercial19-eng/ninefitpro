
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PDFUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF válido.",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // This would call your Supabase Edge Function once connected
      const response = await fetch('/api/processar-pdf', {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': 'user-123' // This would come from auth context
        }
      });

      if (!response.ok) throw new Error('Erro ao processar PDF');

      const data = await response.json();
      setGeneratedWorkout(data.treino);
      
      toast({
        title: "Sucesso!",
        description: "Treino gerado com sucesso a partir do PDF.",
      });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar o PDF. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload de Periodização (PDF)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <p className="text-lg font-medium text-gray-700 mb-2">
                Clique para selecionar ou arraste seu PDF
              </p>
              <p className="text-sm text-gray-500">
                Envie sua periodização em PDF para gerar o treino personalizado
              </p>
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button onClick={() => setFile(null)} variant="outline" size="sm">
                Remover
              </Button>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando PDF...
              </>
            ) : (
              'Gerar Treino com IA'
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedWorkout && (
        <Card>
          <CardHeader>
            <CardTitle>Treino Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(generatedWorkout, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
