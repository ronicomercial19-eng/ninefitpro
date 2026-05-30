# Wave 22 — Ativação real, Skill Manager manual e profundidade do ecossistema

Foco pragmático nos 4 pontos pedidos. Sem novas tabelas além do necessário; reusa `skills`, `physio_modules`, `activation_events`, `skill_events`, `ron_memory`, `ai_context_snapshots`.

## 1. Ativação — tela + rota dedicada

- Nova página `src/pages/9fit/Ativacao.tsx` (`/9fit/ativacao`):
  - Hero "Sua Ativação · Primeiros 14 dias" com progresso (`useActivationProgress`).
  - Lista completa das 6 missões de `ACTIVATION_EVENTS`, cada uma com:
    - status (done / próxima / pendente)
    - dia alvo (d3/d5/d7/d14)
    - CTA real (rota correspondente)
    - botão "Marcar como concluída" quando aplicável (perfil/hub_engagement)
  - Card "Recompensas de Ativação" (XP estimado por etapa).
- `ActivationMissionCard.tsx`: header da missão vira clicável → `/9fit/ativacao`; adicionar link "Ver todas as missões".
- `App.tsx`: registrar rota `/9fit/ativacao` (lazy).
- Bottom nav / OSDashboard: ao clicar no card de Ativação abre a tela ao invés de só a missão.

## 2. Fotos reais no Ecosystem Grid

- Gerar 8 imagens (`src/assets/modules/*.jpg`, premium para hero, fast para os secundários):
staff, planejamento, ajuste-treino, ron, progress, store, foods, healthflix (categorias do package).
- Migration `update` em `physio_modules` populando `hero_image` com path dos assets para os módulos existentes; inserir os que faltarem (`staff`, `planejamento`, `ajuste-treino`, `ron`, `progress`, `store`, `foods`, `healthflix`) com `connector_key` e `cta_route` corretos.
- `EcosystemGrid.tsx`: fallback ainda válido; já consome `hero_image`.

## 3. Skill Manager manual no painel do professor

- `src/components/admin/SkillManualForm.tsx`: form com `slug`, `name`, `category` (select: training/nutrition/behavior/intelligence/general), `description`, `tags` (chips), `version`, `status` (draft/active), `content` (textarea Markdown/JSON com tabs Markdown ⇄ JSON). Faz `upsert` em `skills` por `slug`.
- `SkillManagerPage.tsx`: adicionar tabs **Importar JSON** (existente) · **Criar manualmente** (novo) · **Biblioteca** (lista existente com editar inline → reabre o form em modo edição).
- `AppSidebar.tsx` (painel professor/admin): garantir item **Skills** apontando para `/app/skills` com ícone `Brain` (verificar se já existe; caso não, adicionar acima de "Configurações").

## 4. Inteligência / profundidade real

Implementar conexões reais que os anexos definem como Tier 1–3:

- `src/services/skills/skillRuntime.ts`:
  - `loadActiveSkillsFor(userId)` → lê `skills` ativas + `skill_activations` do usuário.
  - `buildSkillContext(userId)` → coleta perfil de `athletes`, últimas `bio_*`, fase de periodização, e devolve um contexto enxuto.
  - `injectSkillsIntoPrompt(context, basePrompt)` cache em memória (TTL 1h) — porta enxuta do `SkillArchitecture.ts` anexado.
  - Loga em `skill_events` (event_type: applied/error).
- Edge function `ai-coach`: aceitar `skillContextRef` e prefixar o system prompt com `injectSkillsIntoPrompt`. (Mudança mínima, sem quebrar contrato atual.)
- `recommendationEngine.ts`: passar a consumir `skill_events` recentes + `bio_recovery_state` + `activation_events` para priorizar recomendações (ex.: se HRV baixo → sugerir protocolo Recovery; se ativação travada → sugerir próxima missão).
- `OSDashboard.tsx`: nova seção "Inteligência ativa hoje" mostrando até 3 skills ativas que influenciaram as recomendações (badge + nome).

## 5. Pequenos ajustes de coerência

- `Hub.tsx` e `Train.tsx`: passar `category` correto ao `EcosystemGrid` (`hub` / `training`) para refletir as fotos novas.
- Memória: atualizar `mem://index.md` com referência `Ativação Tela` e `Skill Manager Manual`.

6. **📄 CÓDIGO 1: Painel do Professor (**`TeacherWorkoutPanel.tsx`**)**
  **tsx**
  ```
  import React, { useState, useEffect } from 'react'; 
  import { Plus, Trash2, Save, X, Search, Dumbbell, ChevronRight, Package, BookOpen } from 'lucide-react'; 
  import { Workout, Exercise, UserProfile, Assignment } from '../../types'; 
  import { createWorkout, fetchExerciseLibrary } from '../../services/workoutService'; 
  import { assignProductToStudent } from '../../services/assignmentService'; 
  import { Button } from '../ui/Button'; 

  interface TeacherWorkoutPanelProps { 
    studentId: string; 
    onClose: () => void; 
  } 

  export const TeacherWorkoutPanel: React.FC<TeacherWorkoutPanelProps> = ({ studentId, onClose }) => { 
    const [activeTab, setActiveTab] = useState<'WORKOUT' | 'ASSIGNMENT'>('WORKOUT'); 
    const [title, setTitle] = useState(''); 
    const [dayOfWeek, setDayOfWeek] = useState(1); 
    const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]); 
    const [library, setLibrary] = useState<Exercise[]>([]); 
    const [searchTerm, setSearchTerm] = useState(''); 
    const [loading, setLoading] = useState(false); 

    const products = [ 
      { id: 'ebook_1', name: 'Manual da Hipertrofia v2', thumb: 'https://unsplash.com' }, 
      { id: 'ebook_2', name: 'Guia Nutricional 9FIT', thumb: 'https://unsplash.com' }, 
      { id: 'course_1', name: 'Masterclass: Biomecânica', thumb: 'https://unsplash.com' }, 
    ]; 

    useEffect(() => { 
      const loadLibrary = async () => { 
        const exercises = await fetchExerciseLibrary(); 
        setLibrary(exercises); 
      }; 
      loadLibrary(); 
    }, []); 

    const handleAddExercise = (exercise: Exercise) => { 
      setSelectedExercises([...selectedExercises, { ...exercise, id: Math.random().toString(36).substr(2, 9) }]); 
    }; 

    const handleRemoveExercise = (id: string) => { 
      setSelectedExercises(selectedExercises.filter(e => e.id !== id)); 
    }; 

    const handleAssignProduct = async (product: typeof products[0]) => { 
      setLoading(true); 
      try { 
        await assignProductToStudent({ 
          studentId, 
          teacherId: 'current_teacher', 
          productId: product.id, 
          productName: product.name, 
          thumbnailUrl: product.thumb, 
          accessUrl: 'https://ninefit.com' + product.id, 
          status: 'active' 
        }); 
        alert('Produto atribuído com sucesso!'); 
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      } 
    }; 

    const handleSave = async () => { 
      if (!title || selectedExercises.length === 0) return; 
      setLoading(true); 
      try { 
        await createWorkout(studentId, { 
          title, 
          subtitle: `${selectedExercises.length} exercícios`, 
          exercisesCount: selectedExercises.length, 
          image: selectedExercises[0].image, 
          exercises: selectedExercises, 
          dayOfWeek, 
          userId: studentId 
        }); 
        onClose(); 
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      } 
    }; 

    const filteredLibrary = library.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())); 

    return ( 
      <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-fade-in font-chakra"> 
        {/* Header */} 
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-dark-900"> 
          <div className="flex items-center gap-6"> 
            <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-full transition-colors"> 
              <X size={24} className="text-gray-400" /> 
            </button> 
            <div className="flex items-center gap-4 bg-white/5 p-1 rounded-2xl"> 
              <button onClick={() => setActiveTab('WORKOUT')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'WORKOUT' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`} > 
                Novo Treino 
              </button> 
              <button onClick={() => setActiveTab('ASSIGNMENT')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ASSIGNMENT' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`} > 
                Atribuir Produto 
              </button> 
            </div> 
          </div> 
          {activeTab === 'WORKOUT' && ( 
            <Button onClick={handleSave} disabled={loading} className="bg-neon-400 text-black px-8 font-black uppercase italic"> 
              {loading ? 'Processando...' : 'Publicar Protocolo'} 
            </Button> 
          )} 
        </div> 

        <div className="flex-1 flex overflow-hidden"> 
          {activeTab === 'WORKOUT' ? ( 
            <> 
              {/* Left: Workout Details */} 
              <div className="w-1/2 p-8 overflow-y-auto border-r border-white/5 space-y-8 bg-dark-950"> 
                <div className="space-y-4"> 
                  <div> 
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Identificação do Protocolo</label> 
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: A - FORÇA NEURAL" className="w-full bg-dark-800 border border-dark-700 rounded-xl p-4 text-white font-black uppercase tracking-tighter italic focus:border-neon-400 outline-none text-xl transition-all" /> 
                  </div> 
                  <div> 
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Dia da Semana (Trigger)</label> 
                    <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value))} className="w-full bg-dark-800 border border-dark-700 rounded-xl p-4 text-white font-bold uppercase tracking-wider focus:border-neon-400 outline-none transition-all" > 
                      <option value={1}>Segunda-feira</option> 
                      <option value={2}>Terça-feira</option> 
                      <option value={3}>Quarta-feira</option> 
                      <option value={4}>Quinta-feira</option> 
                      <option value={5}>Sexta-feira</option> 
                      <option value={6}>Sábado</option> 
                      <option value={0}>Domingo</option> 
                    </select> 
                  </div> 
                </div> 

                <div className="space-y-4"> 
                  <h3 className="text-white font-black italic uppercase tracking-wider text-xs">Sequência do Treino ({selectedExercises.length})</h3> 
                  {selectedExercises.length === 0 ? ( 
                    <div className="bg-dark-900 border border-dashed border-dark-700 py-16 rounded-[2.5rem] text-center opacity-40"> 
                      <Dumbbell className="mx-auto text-gray-700 mb-4" size={48} /> 
                      <p className="text-gray-600 text-[10px] uppercase font-black tracking-widest">Selecione nós na biblioteca</p> 
                    </div> 
                  ) : ( 
                    <div className="space-y-3"> 
                      {selectedExercises.map((ex, idx) => ( 
                        <div key={ex.id} className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all"> 
                          <div className="flex items-center gap-4"> 
                            <span className="text-neon-400 font-black italic text-2xl">{idx + 1}</span> 
                            <div> 
                              <h4 className="text-white font-black uppercase text-xs tracking-tight">{ex.name}</h4> 
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{ex.sets}x{ex.reps} • {ex.rest} Descanso</p> 
                            </div> 
                          </div> 
                          <button onClick={() => handleRemoveExercise(ex.id)} className="text-gray-600 hover:text-red-500 transition-colors bg-white/5 p-2 rounded-xl"> 
                            <Trash2 size={16} /> 
                          </button> 
                        </div> 
                      ))} 
                    </div> 
                  )} 
                </div> 
              </div> 

              {/* Right: Library */} 
              <div className="w-1/2 p-8 bg-dark-900 overflow-y-auto"> 
                <div className="mb-8 space-y-4"> 
                  <h3 className="text-white font-black italic uppercase tracking-wider text-xs">Biblioteca de Alta Performance</h3> 
                  <div className="relative"> 
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} /> 
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar exercícios..." className="w-full bg-dark-800 border border-dark-700 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold uppercase tracking-wider focus:border-neon-400 outline-none transition-all placeholder:text-gray-600" /> 
                  </div> 
                </div> 

                <div className="grid grid-cols-1 gap-3"> 
                  {filteredLibrary.map(ex => ( 
                    <div key={ex.id} onClick={() => handleAddExercise(ex)} className="bg-dark-800 border border-dark-700 p-4 rounded-2xl flex items-center justify-between hover:border-neon-400 cursor-pointer group transition-all" > 
                      <div className="flex items-center gap-4"> 
                        <div className="w-14 h-14 bg-black rounded-xl overflow-hidden relative border border-white/5"> 
                          <img src={ex.image} alt={ex.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" /> 
                        </div> 

  ```
  Use o código com cuidado.
  {[ex.name](http://ex.name)}  
    
    
    
    
    
  ))}  
    
    
  </>  
  ) : (  
    
    
    
  Portal de Atribuições  
  Aloque produtos digitais diretamente para o usuário em tempo real.  

    
  {[products.map](http://products.map)(p => (  
    
    
    
    
    
    
  {[p.name](http://p.name)}  
  Asset Digital • Premium Access  
    
  <Button onClick={() => handleAssignProduct(p)} disabled={loading} className="bg-white text-black py-4 font-black uppercase italic rounded-2xl group-hover:bg-neon-400 transition-colors" >  
  Atribuir Agora  
    
    
  ))}  
    
    
    
  )}  
    
    
  );  
  };
  ```

  ---

  ### 📄 CÓDIGO 3: Tela Inicial de Treinos do Aluno (`WorkoutHome.tsx`)
  ```tsx
  import React, { useEffect, useState } from 'react'; 
  import { motion } from 'motion/react'; 
  import { Calendar, ChevronRight, Loader2 } from 'lucide-react'; 
  import { Workout } from '../../types'; 
  import { fetchExerciseLibrary } from '../../services/exerciseService'; 

  interface WorkoutHomeProps { 
    onSelectWorkout: (workout: Workout) => void; 
  } 

  const MOCK_WORKOUTS: Workout[] = [ 
    { 
      id: '1', 
      title: 'A - PEITORAL, OMBRO, TRÍCEPS', 
      subtitle: '5 exercícios', 
      exercisesCount: 5, 
      image: 'https://unsplash.com', 
      exercises: [ 
        { id: 'c1', name: 'CÁRDIO', sets: '4 x 5 séries', reps: '30s', rest: '30s', tempo: '190 bpm', image: 'https://unsplash.com' }, 
        { id: 'e1', name: 'SUPINO HALTERES INCLINADO(A)', sets: 'Séries 2x', reps: '8-10 Repetições', rest: '45 - 60s', tempo: '0-1-0-1', activeRest: 'MEIO BURPEE', image: 'https://unsplash.com' } 
      ] 
    } 
  ]; 

  export const WorkoutHome: React.FC<WorkoutHomeProps> = ({ onSelectWorkout }) => { 
    const [workouts, setWorkouts] = useState<Workout[]>([]); 
    const [loading, setLoading] = useState(true); 

    useEffect(() => { 
      const loadExercises = async () => { 
        setLoading(true); 
        const libraryExercises = await fetchExerciseLibrary(); 
        if (libraryExercises.length > 0) { 
          const workoutA: Workout = { 
            id: '1', 
            title: 'A - PROTOCOLO SUPERIOR', 
            subtitle: `${libraryExercises.length} exercícios`, 
            exercisesCount: libraryExercises.length, 
            image: libraryExercises[0].image, 
            exercises: libraryExercises 
          }; 
          setWorkouts([workoutA]); 
        } else { 
          setWorkouts(MOCK_WORKOUTS); 
        } 
        setLoading(false); 
      }; 
      loadExercises(); 
    }, []); 

    if (loading) { 
      return ( 
        <div className="flex flex-col items-center justify-center py-20 space-y-4"> 
          <Loader2 className="text-neon-400 animate-spin" size={40} /> 
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Sincronizando Biblioteca...</p> 
        </div> 
      ); 
    } 

    return ( 
      <div className="space-y-8 animate-fade-in"> 
        {/* Hero Section */} 
        <div className="relative h-72 rounded-3xl overflow-hidden group"> 
          <motion.img initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }} src="https://unsplash.com" alt="Workout" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> 
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div> 
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,85,0,0.1),transparent_70%)]"></div> 
          
          {/* Futuristic HUD elements */} 
          <div className="absolute top-6 right-6 flex flex-col items-end gap-1"> 
            <div className="flex gap-1"> 
              {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-4 bg-neon-400/40 rounded-full"></div>)} 
            </div> 
            <span className="text-[8px] text-neon-400 font-bold tracking-widest uppercase">System Active</span> 
          </div> 

          <div className="absolute bottom-8 left-8 space-y-2"> 
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="inline-block px-3 py-1 bg-neon-400 text-black text-[10px] font-black uppercase tracking-widest rounded-sm mb-2" > 
              Nível Avançado 
            </motion.div> 
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none"> EMAGRECIMENTO <span className="text-neon-400">PRO</span> </h2> 
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2"> 
              <span className="w-2 h-2 bg-neon-400 rounded-full animate-pulse"></span> TREINO 4 • 18 TREINOS EM 6 SEMANAS 
            </p> 
          </div> 
        </div> 

        {/* Progress Section */} 
        <div className="bg-dark-900/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl relative overflow-hidden"> 
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-400/5 blur-3xl rounded-full"></div> 
          <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2"> 
            <div className="w-1 h-3 bg-neon-400"></div> STATUS DO OPERATIVO </h3> 
          <div className="grid grid-cols-3 gap-8"> 
            <div className="space-y-1"> 
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Início</p> 
              <p className="text-white font-black text-lg italic tracking-tighter">13.12.24</p> 
            </div> 
            <div className="space-y-1"> 
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Concluídos</p> 
              <p className="text-neon-400 font-black text-lg italic tracking-tighter">04 <span className="text-[10px] text-gray-500">LVL</span></p> 
            </div> 
            <div className="space-y-1"> 
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ciclo</p> 
              <p className="text-white font-black text-lg italic tracking-tighter">06 <span className="text-[10px] text-gray-500">SEM</span></p> 
            </div> 
          </div> 
        </div> 

        {/* Support Level */} 
        <div className="bg-dark-900/50 backdrop-blur-md border border-white/5 p-8 rounded-2xl relative overflow-hidden"> 
          <div className="flex justify-between items-center mb-8"> 
            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"> 
              <div className="w-1 h-3 bg-blue-400"></div> NÍVEL DE SUPORTE </h3> 
            <span className="text-white font-black italic uppercase text-sm tracking-tighter">MÉDIO</span> 
          </div> 
          <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden"> 
            <motion.div initial={{ width: 0 }} animate={{ width: '50%' }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]" ></motion.div> 
            <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" ></motion.div> 
          </div> 
          <div className="flex justify-between mt-4"> 
            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Autônomo</span> 
            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Assistido</span> </div> 
          <p className="text-[10px] text-gray-400 uppercase font-bold text-center mt-6 tracking-widest leading-relaxed"> SISTEMA CONFIGURADO PARA ASSISTÊNCIA MODERADA DURANTE A EXECUÇÃO </p> 
        </div> 

        {/* Next Workout */} 
        <div className="space-y-4"> 
          <div className="flex justify-between items-end"> 
            <h3 className="text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"> 
              <div className="w-1 h-3 bg-neon-400"></div> PRÓXIMO TREINO </h3> 
            <button className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1 hover:text-white transition-colors tracking-widest"> AGENDAMENTOS <ChevronRight size={12} /> </button> 
          </div> 
          {workouts.map(workout => ( 
            <motion.div key={workout.id} whileHover={{ scale: 1.02, borderColor: 'rgba(255,85,0,0.3)' }} whileTap={{ scale: 0.98 }} onClick={() => onSelectWorkout(workout)} className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group border border-white/5 transition-all duration-300" > 
              <img src={workout.image} alt={workout.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80" referrerPolicy="no-referrer" /> 
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div> 
              
              {/* Card Content */} 
              <div className="absolute inset-0 flex items-center p-8"> 
                <div className="relative"> 
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-black font-black text-3xl italic mr-6 shadow-2xl group-hover:bg-neon-400 transition-colors"> A </div> 
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-neon-400 rounded-full flex items-center justify-center text-black text-[10px] font-black border-4 border-black"> ! </div> 
                </div> 
                <div className="flex-1 space-y-1"> 
                  <h4 className="text-white font-black uppercase text-2xl leading-none italic tracking-tighter group-hover:text-neon-400 transition-colors"> {workout.title} </h4> 
                  <div className="flex items-center gap-3"> 
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]"> {workout.subtitle} </p> 
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div> 
                    <p className="text-neon-400 text-[10px] uppercase font-bold tracking-[0.2em]"> 450 XP </p> 
                  </div> 
                </div> 
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-neon-400/50 transition-colors"> 

  ```
    
    
    
  {/* Hover scanline effect */}  
    
  </motion.div>  
  ))}  

  {/* Previous Workouts */}  
    
  ANTERIORES  
  Nenhum treino anterior registrado   
    
    
  );  
  };
  Disse: e o codigo pro fitpro do aluno
  Aqui está o código completo do `WorkoutHome.tsx` (o painel FitPro do Aluno) estruturado em seção de texto limpa.
  Este código contém toda a interface visual futurista, os cards de progresso com desfoque de fundo (`backdrop-blur`), o HUD animado do operativo e a listagem interativa de treinos sincronizados que você enviou.
  **📱 Código:** `src/components/workout/WorkoutHome.tsx`
  **tsx**
  ```
  import React, { useEffect, useState } from 'react';
  import { motion } from 'motion/react';
  import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
  import { Workout } from '../../types';
  import { fetchExerciseLibrary } from '../../services/exerciseService';

  interface WorkoutHomeProps {
    onSelectWorkout: (workout: Workout) => void;
  }

  const MOCK_WORKOUTS: Workout[] = [
    {
      id: '1',
      title: 'A - PEITORAL, OMBRO, TRÍCEPS',
      subtitle: '5 exercícios',
      exercisesCount: 5,
      image: 'https://unsplash.com',
      exercises: [
        {
          id: 'c1',
          name: 'CÁRDIO',
          sets: '4 x 5 séries',
          reps: '30s',
          rest: '30s',
          tempo: '190 bpm',
          image: 'https://unsplash.com'
        },
        {
          id: 'e1',
          name: 'SUPINO HALTERES INCLINADO(A)',
          sets: 'Séries 2x',
          reps: '8-10 Repetições',
          rest: '45 - 60s',
          tempo: '0-1-0-1',
          activeRest: 'MEIO BURPEE',
          image: 'https://unsplash.com'
        }
      ]
    }
  ];

  export const WorkoutHome: React.FC<WorkoutHomeProps> = ({ onSelectWorkout }) => {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadExercises = async () => {
        setLoading(true);
        const libraryExercises = await fetchExerciseLibrary();
        
        if (libraryExercises.length > 0) {
          const workoutA: Workout = {
            id: '1',
            title: 'A - PROTOCOLO SUPERIOR',
            subtitle: `${libraryExercises.length} exercícios`,
            exercisesCount: libraryExercises.length,
            image: libraryExercises[0].image,
            exercises: libraryExercises
          };
          setWorkouts([workoutA]);
        } else {
          setWorkouts(MOCK_WORKOUTS);
        }
        setLoading(false);
      };

      loadExercises();
    }, []);

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="text-neon-400 animate-spin" size={40} />
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Sincronizando Biblioteca...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="relative h-72 rounded-3xl overflow-hidden group">
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            src="https://unsplash.com"
            alt="Workout"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,85,0,0.1),transparent_70%)]"></div>

          {/* Futuristic HUD elements */}
          <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-1 h-4 bg-neon-400/40 rounded-full"></div>
              ))}
            </div>
            <span className="text-[8px] text-neon-400 font-bold tracking-widest uppercase">System Active</span>
          </div>

          <div className="absolute bottom-8 left-8 space-y-2">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block px-3 py-1 bg-neon-400 text-black text-[10px] font-black uppercase tracking-widest rounded-sm mb-2"
            >
              Nível Avançado
            </motion.div>
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
              EMAGRECIMENTO <span className="text-neon-400">PRO</span>
            </h2>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-400 rounded-full animate-pulse"></span> TREINO 4 • 18 TREINOS EM 6 SEMANAS
            </p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-dark-900/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-400/5 blur-3xl rounded-full"></div>
          <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
            <div className="w-1 h-3 bg-neon-400"></div> STATUS DO OPERATIVO
          </h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Início</p>
              <p className="text-white font-black text-lg italic tracking-tighter">13.12.24</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Concluídos</p>
              <p className="text-neon-400 font-black text-lg italic tracking-tighter">04 <span className="text-[10px] text-gray-500">LVL</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ciclo</p>
              <p className="text-white font-black text-lg italic tracking-tighter">06 <span className="text-[10px] text-gray-500">SEM</span></p>
            </div>
          </div>
        </div>

        {/* Support Level */}
        <div className="bg-dark-900/50 backdrop-blur-md border border-white/5 p-8 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-400"></div> NÍVEL DE SUPORTE
            </h3>
            <span className="text-white font-black italic uppercase text-sm tracking-tighter">MÉDIO</span>
          </div>
          <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '50%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]"
            ></motion.div>
            {/* Animated glow pulse */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            ></motion.div>
          </div>
          <div className="flex justify-between mt-4">
            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Autônomo</span>
            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Assistido</span>
          </div>
          <p className="text-[10px] text-gray-400 uppercase font-bold text-center mt-6 tracking-widest leading-relaxed">
            SISTEMA CONFIGURADO PARA ASSISTÊNCIA MODERADA DURANTE A EXECUÇÃO
          </p>
        </div>

        {/* Next Workout */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <div className="w-1 h-3 bg-neon-400"></div> PRÓXIMO TREINO
            </h3>
            <button className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1 hover:text-white transition-colors tracking-widest">
              AGENDAMENTOS <ChevronRight size={12} />
            </button>
          </div>

          {workouts.map(workout => (
            <motion.div
              key={workout.id}
              whileHover={{ scale: 1.02, borderColor: 'rgba(255,85,0,0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectWorkout(workout)}
              className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group border border-white/5 transition-all duration-300"
            >
              <img
                src={workout.image}
                alt={workout.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>

              {/* Card Content */}
              <div className="absolute inset-0 flex items-center p-8">
                <div className="relative">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-black font-black text-3xl italic mr-6 shadow-2xl group-hover:bg-neon-400 transition-colors">
                    A
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-neon-400 rounded-full flex items-center justify-center text-black text-[10px] font-black border-4 border-black">
                    !
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <h4 className="text-white font-black uppercase text-2xl leading-none italic tracking-tighter group-hover:text-neon-400 transition-colors">
                    {workout.title}
                  </h4>
                  <div className="flex items-center gap-3">
  ```

## Ordem de execução

1. Migration `physio_modules` (insert/update com hero_image + connector_key).
2. Geração dos assets de imagem.
3. Página `Ativacao.tsx` + rota + link no card.
4. `SkillManualForm.tsx` + tabs no `SkillManagerPage` + item de sidebar.
5. `skillRuntime.ts` + integração no `ai-coach` e `recommendationEngine`.
6. Seção "Inteligência ativa hoje" no `OSDashboard`.
7. Atualização de memória.
8. inclusao do codigo no painel do professor / painel de acesso do aluno completo. 

## Não-objetivos

- Não criar novas tabelas (reusar as existentes).
- Não mexer em auth, monetização ou onboarding.
- Não substituir o uploader JSON existente — somar a opção manual.  
- 