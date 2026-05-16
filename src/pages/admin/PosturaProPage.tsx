import { Activity, Upload, ScanLine, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PosturaProPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary" /> Postura Pro Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análise postural assistida — integração via API externa do ecossistema 9FIT.
        </p>
      </div>

      <Card className="border-primary/30">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <ScanLine className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-display uppercase">Bridge pronta · aguardando API externa</p>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Conector criado. Quando a chave da API for fornecida, este módulo passa a receber relatórios sem delay.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button variant="outline" disabled><Upload className="w-4 h-4 mr-2" />Upload foto (em breve)</Button>
            <Button disabled><Cpu className="w-4 h-4 mr-2" />Conectar API</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
