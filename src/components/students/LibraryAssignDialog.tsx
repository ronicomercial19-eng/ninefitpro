import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LibraryItem {
  id?: string;
  external_id?: string;
  type: string;
  slug?: string | null;
  name: string;
  thumbnail_url?: string | null;
  player_url?: string | null;
  payload?: any;
}

interface Athlete { id: string; name: string; email?: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: LibraryItem | null;
}

export function LibraryAssignDialog({ open, onOpenChange, item }: Props) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("athletes").select("id, name, email").order("name").limit(500)
      .then(({ data }) => setAthletes((data as any) || []));
  }, [open]);

  const handleAssign = async () => {
    if (!item || !athleteId) {
      toast.error("Selecione um aluno");
      return;
    }
    setLoading(true);
    try {
      const p = item.payload || {};
      const content_ref = item.slug || item.external_id || p.id || p.slug || item.name;

      // Prefer real image thumbnails over page URLs
      const thumb = p.thumbnailUrl || p.thumbnail_url || (item.thumbnail_url && /\.(jpg|jpeg|png|webp|gif)/i.test(item.thumbnail_url) ? item.thumbnail_url : null) || null;

      const player_url = p.playerUrl || p.executarUrl || item.player_url || null;
      const access_url = p.episodeUrl || p.accessUrl || p.access_url || null;
      const download_url = p.downloadUrl || p.download_url || p.pdfUrl || null;

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("student_library_assignments").insert({
        athlete_id: athleteId,
        content_type: item.type,
        content_ref,
        content_title: item.name,
        thumbnail_url: thumb,
        player_url,
        access_url,
        download_url,
        payload: p,
        notes: notes || null,
        assigned_by: user?.id,
      } as any);
      if (error) throw error;
      toast.success(`${item.name} atribuído!`);
      onOpenChange(false);
      setAthleteId(""); setNotes("");
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Já atribuído a este aluno" : (e?.message || "Erro ao atribuir"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir conteúdo</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs uppercase text-muted-foreground">{item.type}</p>
              <p className="font-bold">{item.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: programa de 8 semanas..." />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={loading || !athleteId}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
