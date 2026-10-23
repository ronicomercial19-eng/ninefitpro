import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
type Student = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  objetivo: string;
  nivel_experiencia?: string;
  observacoes?: string;
  peso_kg?: number;
  altura_cm?: number;
  [key: string]: any;
};
export function StudentPersonalData({
  student,
  onStudentUpdate,
}: {
  student: Student;
  onStudentUpdate: (value: Partial<Student>) => void;
}) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({ ...student });
  const qc = useQueryClient();
  const fields = [
    ["Nome", "nome", "text"],
    ["Telefone", "telefone", "tel"],
    ["Nascimento", "data_nascimento", "date"],
    ["Objetivo cadastral", "objetivo", "text"],
    ["Experiência", "nivel_experiencia", "text"],
    ["Restrições e observações profissionais", "observacoes", "text"],
    ["Peso cadastral (kg)", "peso_kg", "number"],
    ["Altura cadastral (cm)", "altura_cm", "number"],
  ];
  async function save() {
    if (busy || !form.nome?.trim()) return;
    setBusy(true);
    try {
      const value = (key: string) =>
        form[key] === "" || form[key] == null ? null : form[key];
      const { data, error } = await supabase
        .from("athletes")
        .update({
          name: form.nome.trim(),
          phone: value("telefone"),
          birthdate: value("data_nascimento"),
          primary_goal: value("objetivo"),
          experience_level: value("nivel_experiencia"),
          injuries_limitations: value("observacoes"),
          peso_kg: value("peso_kg"),
          altura_cm: value("altura_cm"),
        })
        .eq("id", student.id)
        .select(
          "name,phone,birthdate,primary_goal,experience_level,injuries_limitations,peso_kg,altura_cm",
        )
        .single();
      if (error) throw error;
      onStudentUpdate({
        nome: data.name,
        telefone: data.phone ?? undefined,
        data_nascimento: data.birthdate ?? undefined,
        objetivo: data.primary_goal ?? "",
        nivel_experiencia: data.experience_level ?? undefined,
        observacoes: data.injuries_limitations ?? undefined,
        peso_kg: data.peso_kg ?? undefined,
        altura_cm: data.altura_cm ?? undefined,
      });
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["coach-student-context"] });
      await qc.invalidateQueries({ queryKey: ["professor-students"] });
      toast.success(
        "Cadastro atualizado. As respostas pessoais da ficha foram preservadas.",
      );
    } catch (e) {
      toast.error(
        "Não foi possível salvar o cadastro. " + ((e as any)?.message || ""),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex justify-between gap-3">
        <h2 className="text-xl font-semibold">Dados cadastrais</h2>
        {!editing ? (
          <Button
            onClick={() => {
              setForm({ ...student });
              setEditing(true);
            }}
          >
            Editar cadastro
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              disabled={busy || !form.nome?.trim()}
              onClick={() => void save()}
            >
              Salvar
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        A ficha declarada pelo aluno aparece no acompanhamento e é preservada
        separadamente. E-mail de acesso: {student.email || "não informado"}.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(([label, key, type]) => (
          <label className="text-sm" key={key}>
            {label}
            {editing ? (
              <input
                aria-label={label}
                type={type}
                disabled={busy}
                maxLength={key === "observacoes" ? 2000 : 200}
                value={form[key] ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]:
                      type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border bg-background p-2"
              />
            ) : (
              <p className="mt-1 rounded bg-muted/30 p-2">
                {student[key] ?? "Não informado"}
              </p>
            )}
          </label>
        ))}
      </div>
    </section>
  );
}
