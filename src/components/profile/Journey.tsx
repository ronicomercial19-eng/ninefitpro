import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Workout {
  id: string;
  created_at?: string;
  exercises: any; // may come as Json from DB
  status?: string;
}

export default function Journey({ userEmail }: { userEmail: string }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!userEmail) return;
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();
      if (!student?.id) return;
      const { data } = await supabase
        .from("workouts")
        .select("id, created_at, exercises, status")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      const safe = (data || []).map((w: any) => ({ ...w, exercises: Array.isArray(w.exercises) ? w.exercises : [] }));
      setWorkouts(safe);
    };
    run();
  }, [userEmail]);

  const chartData = useMemo(() => {
    const w = workouts.find((x) => x.id === selectedId);
    if (!w) return [] as Array<{ name: string; carga: number }>; 
    return (w.exercises || []).map((ex: any, idx: number) => {
      const carga = Number(ex.carga || ex.load || 0) || 0;
      return { name: ex.nome || `Ex ${idx+1}`, carga };
    });
  }, [selectedId, workouts]);

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Minha jornada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workouts.length === 0 && (
            <div className="text-gray-400 text-sm">Nenhum treino encontrado.</div>
          )}
          {workouts.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedId(w.id)}
              className={`w-full text-left p-3 rounded-md ${selectedId === w.id ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700`}
            >
              <div className="text-white font-medium">Treino {w.id.slice(0, 6)}</div>
              <div className="text-gray-400 text-xs">{new Date(w.created_at || '').toLocaleString()}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {selectedId && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Analytics do Treino</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            {chartData.length === 0 ? (
              <div className="text-gray-400 text-sm">Sem dados de carga para este treino.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#9ca3af"/>
                  <YAxis stroke="#9ca3af"/>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', color: '#fff' }} />
                  <Area type="monotone" dataKey="carga" stroke="#fb923c" fill="url(#colorCarga)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
