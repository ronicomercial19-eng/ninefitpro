import { useState, useEffect, useRef, useCallback } from "react";
import { Watch, Bluetooth, Heart, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type WearableState = "disconnected" | "connecting" | "connected" | "active";

interface WearableConnectBoxProps {
  isWorkoutActive?: boolean;
  onHeartRateUpdate?: (bpm: number) => void;
  onSessionData?: (data: { avgBpm: number; maxBpm: number; minBpm: number; duration: number }) => void;
}

export function WearableConnectBox({ isWorkoutActive, onHeartRateUpdate, onSessionData }: WearableConnectBoxProps) {
  const [state, setState] = useState<WearableState>("disconnected");
  const [bpm, setBpm] = useState(0);
  const [zone, setZone] = useState("");
  const [error, setError] = useState("");
  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);
  const bpmHistoryRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const getZone = (hr: number) => {
    if (hr < 100) return "Repouso";
    if (hr < 130) return "Queima de Gordura";
    if (hr < 155) return "Cardio";
    if (hr < 175) return "Anaeróbico";
    return "VO2 Max";
  };

  const getZoneColor = (z: string) => {
    switch (z) {
      case "Repouso": return "text-blue-400";
      case "Queima de Gordura": return "text-green-400";
      case "Cardio": return "text-yellow-400";
      case "Anaeróbico": return "text-orange-400";
      case "VO2 Max": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const handleHeartRate = useCallback((event: Event) => {
    const value = (event.target as any).value;
    if (!value) return;
    const flags = value.getUint8(0);
    const is16Bit = flags & 0x01;
    const heartRate = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
    
    setBpm(heartRate);
    setZone(getZone(heartRate));
    bpmHistoryRef.current.push(heartRate);
    onHeartRateUpdate?.(heartRate);
  }, [onHeartRateUpdate]);

  const connect = async () => {
    if (!(navigator as any).bluetooth) {
      setError("Bluetooth não suportado neste dispositivo");
      return;
    }

    setState("connecting");
    setError("");

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["heart_rate"],
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () => {
        setState("disconnected");
        setBpm(0);
      });

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");
      
      charRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", handleHeartRate);

      setState("connected");
      startTimeRef.current = Date.now();
      bpmHistoryRef.current = [];

      if (isWorkoutActive) setState("active");
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        setError("Erro ao conectar. Tente novamente.");
      }
      setState("disconnected");
    }
  };

  const disconnect = () => {
    if (charRef.current) {
      charRef.current.removeEventListener("characteristicvaluechanged", handleHeartRate);
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }

    // Emit session data
    const history = bpmHistoryRef.current;
    if (history.length > 0 && onSessionData) {
      onSessionData({
        avgBpm: Math.round(history.reduce((a, b) => a + b, 0) / history.length),
        maxBpm: Math.max(...history),
        minBpm: Math.min(...history),
        duration: Math.round((Date.now() - startTimeRef.current) / 60000),
      });
    }

    setState("disconnected");
    setBpm(0);
  };

  useEffect(() => {
    if (state === "connected" && isWorkoutActive) setState("active");
  }, [isWorkoutActive, state]);

  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  if (state === "disconnected") {
    return (
      <div className="bg-card border border-border rounded-sm p-3">
        <button
          onClick={connect}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Watch className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Conectar Wearable</p>
            <p className="text-[10px] text-muted-foreground">Monitore frequência cardíaca em tempo real</p>
          </div>
          <Bluetooth className="w-4 h-4 text-muted-foreground" />
        </button>
        {error && <p className="text-[10px] text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  if (state === "connecting") {
    return (
      <div className="bg-card border border-primary/30 rounded-sm p-3 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Buscando dispositivo...</span>
      </div>
    );
  }

  // Connected or Active
  return (
    <div className="bg-card border border-primary/30 rounded-sm p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Heart className="w-6 h-6 text-red-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{bpm} <span className="text-xs font-normal text-muted-foreground">BPM</span></p>
            <p className={`text-[10px] font-bold uppercase ${getZoneColor(zone)}`}>{zone}</p>
          </div>
        </div>
        <button onClick={disconnect} className="p-2 hover:bg-muted rounded-sm transition-colors">
          <WifiOff className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
