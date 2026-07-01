*** Begin Patch
*** Update File: src/pages/StudentsPage.tsx
@@
-import { AdicionarAlunoForm } from '@/components/students/AdicionarAlunoForm';
-import { StudentDetailedView } from '@/components/students/StudentDetailedView';
+import { AdicionarAlunoForm } from '@/components/students/AdicionarAlunoForm';
+import { StudentDetailedView } from '@/components/students/StudentDetailedView';
+import { generateWeekForAthlete, listWeekPlans, applyWeekPlan } from '@/services/weekplan.service';
@@
 export default function StudentsPage() {
@@
   const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
+  const [generating, setGenerating] = useState(false);
@@
   const filteredStudents = students.filter(student => {
@@
   };
+
+  const handleGenerateWeek = async (studentId: string) => {
+    try {
+      setGenerating(true);
+      const today = new Date();
+      // Find monday of this week
+      const day = today.getDay();
+      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when sunday
+      const monday = new Date(today.setDate(diff));
+      const weekStart = monday.toISOString().split('T')[0];
+      const res = await generateWeekForAthlete(studentId, weekStart, { useAi: true } as any);
+      if (res.success) {
+        toast.success('Semana gerada em rascunho. Abra o plano para revisar.');
+        // refresh students/list if needed
+      } else {
+        toast.error('Erro ao gerar semana: ' + (res.error?.message || res.error?.code));
+      }
+    } catch (e: any) {
+      console.error('[handleGenerateWeek]', e);
+      toast.error('Erro inesperado ao gerar semana');
+    } finally {
+      setGenerating(false);
+    }
+  };
*** End Patch
