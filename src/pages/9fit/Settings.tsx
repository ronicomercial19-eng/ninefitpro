import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Plug, Brain, Activity, User as UserIcon, Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function NineFitSettings() {
  const [skills, setSkills] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("skills").select("name,status,version,category").eq("status","active")
      .then(({ data }) => setSkills(data ?? []));
    supabase.from("api_connectors").select("key,provider,status,auth_mode")
      .then(({ data }) => setConnectors(data ?? []));
    supabase.from("physio_modules").select("key,name,status,category").eq("status","active")
      .then(({ data }) => setModules(data ?? []));
  }, []);

  const sections = [
    { id: "ecossistema", label: "Ecossistema", icon: Layers, items: modules.map(m => ({ label: m.name, sub: m.category, status: m.status })) },
    { id: "skills", label: "Skills", icon: Brain, items: skills.map(s => ({ label: s.name, sub: `${s.category} · v${s.version}`, status: s.status })) },
    { id: "apis", label: "APIs", icon: Plug, items: connectors.map(c => ({ label: c.provider, sub: `${c.key} · ${c.auth_mode}`, status: c.status })) },
    { id: "nexus", label: "Nexus", icon: Activity, items: [{ label: "Realtime", sub: "Postgres changes", status: "active" }] },
    { id: "user", label: "Usuário", icon: UserIcon, items: [{ label: "Perfil", sub: "Auto-gestão", status: "active" }] },
  ];

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display italic">Settings 3.0</h1>
          <p className="text-xs text-muted-foreground">Ecossistema · Skills · APIs · Nexus · Usuário</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {sections.map(s => (
          <Card key={s.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-primary" />
                <h2 className="font-display">{s.label}</h2>
                <Badge variant="outline" className="ml-auto">{s.items.length}</Badge>
              </div>
              <ul className="space-y-1.5">
                {s.items.slice(0,6).map((it, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <div>{it.label}</div>
                      <div className="text-[10px] text-muted-foreground">{it.sub}</div>
                    </div>
                    <Badge variant={it.status === "active" ? "default" : "outline"} className="text-[10px]">{it.status}</Badge>
                  </li>
                ))}
                {!s.items.length && <li className="text-xs text-muted-foreground">vazio</li>}
              </ul>
              {s.id === "skills" && (
                <Link to="/app/skills" className="text-xs text-primary underline">Gerenciar (Professor)</Link>
              )}
              {s.id === "apis" && (
                <Link to="/app/nexus" className="text-xs text-primary underline">Configurar conectores</Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
