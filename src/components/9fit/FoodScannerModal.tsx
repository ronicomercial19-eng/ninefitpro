import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Upload,
  Sparkles,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Scale,
  RefreshCw,
  CheckCircle,
  X,
  FlipHorizontal,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
  ScanLine,
  UtensilsCrossed,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ScanResult {
  dishName: string;
  mealCategory: string;
  portionEstimate: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  confidence: string;
  dietCoachTip: string;
  items: FoodItem[];
}

interface FoodScannerModalProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  onSaved: () => void;
}

const MEAL_CATEGORIES = [
  "Café da Manhã",
  "Almoço",
  "Lanche da Tarde",
  "Jantar",
  "Ceia / Pós-Treino",
];

// Exemplos locais de desenvolvimento sem webcam
const showLocalPresets = import.meta.env.DEV;

const LOCAL_SCAN_PRESETS = [
  {
    label: "Frango, Arroz & Feijão",
    desc: "Prato tradicional brasileiro de almoço",
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    data: {
      dishName: "Frango Grelhado com Arroz, Feijão e Salada",
      mealCategory: "Almoço",
      portionEstimate: "420g",
      calories: 540,
      protein: 42,
      carbs: 62,
      fat: 12,
      fiber: 6,
      confidence: "Alta (96%)",
      dietCoachTip: "Refeição exemplar para hipertrofia. Proteína de alto valor biológico com carboidratos de absorção equilibrada.",
      items: [
        { name: "Peito de Frango Grelhado", portion: "150g", calories: 240, protein: 36, carbs: 0, fat: 5 },
        { name: "Arroz Branco", portion: "130g", calories: 170, protein: 3, carbs: 37, fat: 1 },
        { name: "Feijão Carioca", portion: "90g", calories: 105, protein: 6, carbs: 19, fat: 1 },
        { name: "Mix de Folhas e Tomate", portion: "50g", calories: 25, protein: 1, carbs: 4, fat: 2 },
      ],
    },
  },
  {
    label: "Ovos Mexidos & Torrada",
    desc: "Café da manhã hiperproteico",
    url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    data: {
      dishName: "Ovos Mexidos com Pão Integral e Abacate",
      mealCategory: "Café da Manhã",
      portionEstimate: "240g",
      calories: 380,
      protein: 22,
      carbs: 26,
      fat: 20,
      fiber: 5,
      confidence: "Alta (94%)",
      dietCoachTip: "Gorduras monoinsaturadas excelentes para a produção hormonal e saciedade matinal prolongada.",
      items: [
        { name: "Ovos Mexidos (3 unidades)", portion: "150g", calories: 225, protein: 18, carbs: 2, fat: 15 },
        { name: "Pão 100% Integral (1 fatia)", portion: "40g", calories: 95, protein: 3, carbs: 18, fat: 1 },
        { name: "Abacate Fatiado", portion: "50g", calories: 60, protein: 1, carbs: 3, fat: 5 },
      ],
    },
  },
  {
    label: "Shake de Whey & Banana",
    desc: "Lanche rápido ou pós-treino",
    url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80",
    data: {
      dishName: "Shake Anabólico: Whey Protein, Banana e Aveia",
      mealCategory: "Ceia / Pós-Treino",
      portionEstimate: "400ml",
      calories: 320,
      protein: 34,
      carbs: 38,
      fat: 4,
      fiber: 4,
      confidence: "Alta (98%)",
      dietCoachTip: "Rápido esvaziamento gástrico ideal para a janela anabólica pós-treino com 30g+ de aminoácidos essenciais.",
      items: [
        { name: "Whey Protein Isolado (1 scoop)", portion: "30g", calories: 120, protein: 26, carbs: 2, fat: 1 },
        { name: "Banana Prata Média", portion: "100g", calories: 90, protein: 1, carbs: 23, fat: 0 },
        { name: "Flocos de Aveia", portion: "30g", calories: 110, protein: 4, carbs: 19, fat: 2 },
      ],
    },
  },
];

export function FoodScannerModal({
  open,
  onClose,
  athleteId,
  onSaved,
}: FoodScannerModalProps) {
  // Scanner modes
  const [scanMode, setScanMode] = useState<"plate" | "label">("plate");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Editáveis pelo usuário
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("Almoço");
  const [editedDishName, setEditedDishName] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Iniciar/Desligar câmera
  const startCamera = useCallback(async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("[FoodScanner] Câmera não disponível:", err);
      setCameraActive(false);
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Controlar câmera ao abrir/fechar o modal
  useEffect(() => {
    if (open && !capturedImage && !scanResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, capturedImage, scanResult, startCamera, stopCamera]);

  // Capturar foto da câmera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    stopCamera();
    setCapturedImage(dataUrl);
    analyzeImage(dataUrl);
  };

  // Upload de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        stopCamera();
        setCapturedImage(dataUrl);
        analyzeImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Analisar imagem via backend multimodal Gemini
  const analyzeImage = async (base64Image: string) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos

      const res = await fetch("/api/gemini/scan-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: "image/jpeg",
          scanMode,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const data: ScanResult = json.data;
        setScanResult(data);
        setEditedDishName(data.dishName);
        setSelectedCategory(data.mealCategory || "Almoço");
        setPortionMultiplier(1);
        toast.success("Alimento identificado com sucesso!");
      } else {
        throw new Error(json.error || "Falha na análise");
      }
    } catch (err: any) {
      console.error("[FoodScanner error details]", err);
      if (showLocalPresets) {
        const fallback = LOCAL_SCAN_PRESETS[0].data;
        setScanResult(fallback);
        setEditedDishName(fallback.dishName);
        setSelectedCategory("Almoço");
        toast.info("Análise local gerada para desenvolvimento.");
      } else {
        setScanResult(null);
        toast.error("Não foi possível analisar a imagem", {
          description: err.name === 'AbortError' 
            ? "A análise demorou muito. Verifique sua conexão e tente novamente."
            : "Tire outra foto com mais luz ou registre a refeição manualmente.",
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Usar preset local
  const handleUsePreset = (preset: typeof LOCAL_SCAN_PRESETS[0]) => {
    stopCamera();
    setCapturedImage(preset.url);
    setScanResult(preset.data);
    setEditedDishName(preset.data.dishName);
    setSelectedCategory(preset.data.mealCategory);
    setPortionMultiplier(1);
  };

  // Resetar scanner
  const handleReset = () => {
    setCapturedImage(null);
    setScanResult(null);
    setEditedDishName("");
    setPortionMultiplier(1);
    startCamera();
  };

  // Salvar no banco de dados e sincronizar diário
  const handleSaveToDiet = async () => {
    if (!scanResult || !athleteId) return;

    setSaving(true);
    try {
      const finalCalories = Math.round(scanResult.calories * portionMultiplier);
      const finalProtein = Math.round(scanResult.protein * portionMultiplier);
      const finalCarbs = Math.round(scanResult.carbs * portionMultiplier);
      const finalFat = Math.round(scanResult.fat * portionMultiplier);

      const mealLabel = `${editedDishName || scanResult.dishName} (${selectedCategory})`;

      // 1. Gravar em nutrition_logs
      const { error } = await supabase.from("nutrition_logs").insert({
        athlete_id: athleteId,
        meal_name: mealLabel,
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
        date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      // 2. Sincronizar via edge function progress-sync (atualiza contador do Hub)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        await supabase.functions.invoke("progress-sync", {
          body: {
            kind: "nutrition_log",
            payload: {
              athlete_id: athleteId,
              meal_name: mealLabel,
              calories: finalCalories,
            },
          },
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      toast.success("Refeição registrada na dieta com sucesso! 🥗");
      onSaved();
      onClose();
      handleReset();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar refeição escaneada.");
    } finally {
      setSaving(false);
    }
  };

  // Alternar câmera frontal/traseira
  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Cálculos dinâmicos com multiplicador
  const currentCalories = scanResult
    ? Math.round(scanResult.calories * portionMultiplier)
    : 0;
  const currentProtein = scanResult
    ? Math.round(scanResult.protein * portionMultiplier)
    : 0;
  const currentCarbs = scanResult
    ? Math.round(scanResult.carbs * portionMultiplier)
    : 0;
  const currentFat = scanResult
    ? Math.round(scanResult.fat * portionMultiplier)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0b0c10] border border-white/15 text-white max-w-lg w-full max-h-[92vh] overflow-y-auto p-0 rounded-2xl shadow-2xl">
        {/* Header do Scanner */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <ScanLine className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Scanner de Alimentos IA
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 uppercase">
                  9FIT VISION
                </span>
              </DialogTitle>
              <p className="text-[11px] text-neutral-400">
                Aponte a câmera para o prato ou rótulo para cálculo automático de macros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Scanner */}
        <div className="p-4 space-y-4">
          {/* Seletor de Modo: Prato vs Rótulo */}
          {!scanResult && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setScanMode("plate")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  scanMode === "plate"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Prato / Refeição
              </button>
              <button
                type="button"
                onClick={() => setScanMode("label")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  scanMode === "label"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Rótulo / Embalagem
              </button>
            </div>
          )}

          {/* ÁREA DE VISUALIZAÇÃO / CÂMERA OU RESULTADO */}
          {!scanResult ? (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/15 aspect-[4/3] flex items-center justify-center shadow-inner">
              {/* Vídeo da Câmera ao Vivo */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  cameraActive ? "block" : "hidden"
                }`}
              />

              {/* Canvas oculto para capturar frames */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder e Retículas de Scanner */}
              <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                </div>

                {/* Laser de Escaneamento Animado */}
                <div className="relative w-full">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_#f97316] animate-pulse" />
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-sm" />
                </div>
              </div>

              {/* Fallback caso a câmera não esteja autorizada ou em desktop */}
              {!cameraActive && !capturedImage && (
                <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">Câmera em espera</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Permita o acesso à câmera para escanear seu prato ou envie uma foto da galeria.
                  </p>
                  <Button
                    onClick={startCamera}
                    size="sm"
                    className="mt-3 bg-primary text-primary-foreground text-xs"
                  >
                    Ativar Câmera
                  </Button>
                </div>
              )}

              {/* Overlay de Análise em Andamento */}
              {isScanning && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="w-14 h-14 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Analisando Alimentos com IA</h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs animate-pulse">
                    Identificando porções, proteínas, carboidratos e calorias...
                  </p>
                </div>
              )}

              {/* Botão de Alternar Câmera (Frontal/Traseira) */}
              {cameraActive && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-primary transition-colors"
                  title="Trocar câmera"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* RESULTADO ESCANEADO */
            <div className="space-y-4">
              {/* Card de Resumo Principal com Foto e Nome */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                <div className="flex items-start gap-3">
                  {capturedImage && (
                    <img
                      src={capturedImage}
                      alt="Alimento escaneado"
                      className="w-20 h-20 rounded-xl object-cover border border-white/20 shrink-0 shadow-md"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {scanResult.confidence}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {scanResult.portionEstimate}
                      </span>
                    </div>

                    <Input
                      value={editedDishName}
                      onChange={(e) => setEditedDishName(e.target.value)}
                      placeholder="Nome da refeição"
                      className="mt-1 font-bold text-base text-white bg-black/40 border-white/15 h-8 px-2"
                    />

                    {/* Seletor de Categoria */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {MEAL_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                            selectedCategory === cat
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-white/5 text-neutral-400 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Multiplicador de Porção Consumida */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    Porção consumida:
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "0.5x (Metade)", val: 0.5 },
                      { label: "1x (Normal)", val: 1 },
                      { label: "1.5x", val: 1.5 },
                      { label: "2x (Dobro)", val: 2 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setPortionMultiplier(p.val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold transition-all ${
                          portionMultiplier === p.val
                            ? "bg-primary text-primary-foreground border-primary shadow"
                            : "bg-white/5 text-neutral-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {p.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* GRID DE MACRONUTRIENTES CALCULADOS */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 shadow">
                  <div className="flex justify-center text-primary mb-1">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono uppercase text-neutral-400 block">CALORIAS</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {currentCalories}
                    <span className="text-[10px] text-primary ml-0.5">kcal</span>
                  </span>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 shadow">
                  <div className="flex justify-center text-red-400 mb-1">
                    <Beef className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono uppercase text-neutral-400 block">PROTEÍNA</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {currentProtein}
                    <span className="text-[10px] text-neutral-400 ml-0.5">g</span>
                  </span>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 shadow">
                  <div className="flex justify-center text-amber-400 mb-1">
                    <Wheat className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono uppercase text-neutral-400 block">CARBOS</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {currentCarbs}
                    <span className="text-[10px] text-neutral-400 ml-0.5">g</span>
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 shadow">
                  <div className="flex justify-center text-emerald-400 mb-1">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono uppercase text-neutral-400 block">GORDURA</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {currentFat}
                    <span className="text-[10px] text-neutral-400 ml-0.5">g</span>
                  </span>
                </div>
              </div>

              {/* LISTA DE ITENS INDIVIDUAIS DETECTADOS NO PRATO */}
              {scanResult.items && scanResult.items.length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block">
                    ITENS DETECTADOS NO PRATO ({scanResult.items.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {scanResult.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {item.portion} · {Math.round(item.calories * portionMultiplier)} kcal (P:
                            {Math.round(item.protein * portionMultiplier)}g C:
                            {Math.round(item.carbs * portionMultiplier)}g G:
                            {Math.round(item.fat * portionMultiplier)}g)
                          </p>
                        </div>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DICA NUTRICIONAL DO RON */}
              {scanResult.dietCoachTip && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/25 text-xs text-neutral-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Orientação do RON IA:</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                      {scanResult.dietCoachTip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTROLES DO RODAPÉ */}
          <div className="pt-2">
            {!scanResult ? (
              <div className="space-y-3">
                {/* Botões de Ação da Câmera / Upload */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!cameraActive || isScanning}
                    className="py-3.5 rounded-xl font-bold bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-primary/25 disabled:opacity-40 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Capturar Foto
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="py-3.5 rounded-xl font-semibold border border-white/20 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-40 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Subir da Galeria
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {showLocalPresets && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                      Exemplos locais de desenvolvimento:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {LOCAL_SCAN_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleUsePreset(preset)}
                          className="p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/50 text-left transition-all group"
                        >
                          <p className="text-[11px] font-bold text-white group-hover:text-primary truncate">
                            {preset.label}
                          </p>
                          <p className="text-[9px] text-neutral-400 truncate mt-0.5">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Ações de Confirmação e Registro */
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="py-3.5 rounded-xl font-semibold border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Escanear Outro
                </button>

                <button
                  type="button"
                  onClick={handleSaveToDiet}
                  disabled={saving}
                  className="py-3.5 rounded-xl font-bold bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-primary/25 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar na Dieta
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
