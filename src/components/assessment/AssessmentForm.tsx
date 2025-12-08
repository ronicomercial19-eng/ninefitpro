import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, ArrowLeft, MessageCircle, User, Target, Clock, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssessmentData {
  name: string;
  age: string;
  gender: string;
  experience: string;
  goals: string[];
  availability: string;
  budget: string;
  health: string;
  motivation: string;
}

export const AssessmentForm = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [data, setData] = useState<AssessmentData>({
    name: "",
    age: "",
    gender: "",
    experience: "",
    goals: [],
    availability: "",
    budget: "",
    health: "",
    motivation: ""
  });

  const totalSteps = 8;

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleGoalToggle = (goal: string) => {
    const newGoals = data.goals.includes(goal)
      ? data.goals.filter(g => g !== goal)
      : [...data.goals, goal];
    setData({ ...data, goals: newGoals });
  };

  const generateWhatsAppMessage = () => {
    const message = `
🔥 *AVALIAÇÃO FITNESS COMPLETA*

👤 *Dados Pessoais:*
• Nome: ${data.name}
• Idade: ${data.age}
• Gênero: ${data.gender}

🎯 *Objetivos:*
${data.goals.map(goal => `• ${goal}`).join('\n')}

💪 *Experiência:* ${data.experience}

⏰ *Disponibilidade:* ${data.availability}

💰 *Investimento:* ${data.budget}

❤️ *Saúde:* ${data.health}

🚀 *Motivação:* ${data.motivation}

---
Quero receber meu plano personalizado!
    `.trim();

    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const completeAssessment = () => {
    // Salvar dados da avaliação (implementar com Supabase depois)
    console.log('Assessment completed:', data);
    
    // Redirecionar para dashboard
    navigate('/app');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Vamos nos conhecer!</h2>
              <p className="text-gray-600">Primeiro, me conte um pouco sobre você</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Seu nome completo"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className="w-full p-4 border rounded-lg text-lg"
              />
              
              <RadioGroup 
                value={data.age} 
                onValueChange={(value) => setData({ ...data, age: value })}
              >
                <div className="space-y-3">
                  <p className="font-semibold">Qual sua faixa etária?</p>
                  {["18-25 anos", "26-35 anos", "36-45 anos", "46-55 anos", "55+ anos"].map((age) => (
                    <div key={age} className="flex items-center space-x-2">
                      <RadioGroupItem value={age} id={age} />
                      <label htmlFor={age} className="cursor-pointer">{age}</label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <RadioGroup 
                value={data.gender} 
                onValueChange={(value) => setData({ ...data, gender: value })}
              >
                <div className="space-y-3">
                  <p className="font-semibold">Gênero:</p>
                  {["Masculino", "Feminino", "Prefiro não informar"].map((gender) => (
                    <div key={gender} className="flex items-center space-x-2">
                      <RadioGroupItem value={gender} id={gender} />
                      <label htmlFor={gender} className="cursor-pointer">{gender}</label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Quais são seus objetivos?</h2>
              <p className="text-gray-600">Selecione todos que se aplicam</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Perder peso/gordura",
                "Ganhar massa muscular",
                "Melhorar condicionamento",
                "Aumentar força",
                "Melhorar flexibilidade",
                "Reduzir dores/lesões",
                "Mais energia no dia a dia",
                "Melhorar autoestima"
              ].map((goal) => (
                <div
                  key={goal}
                  onClick={() => handleGoalToggle(goal)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    data.goals.includes(goal)
                      ? "border-yellow-600 bg-yellow-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox checked={data.goals.includes(goal)} />
                    <span className="font-medium">{goal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Qual sua experiência com exercícios?</h2>
            </div>
            
            <RadioGroup 
              value={data.experience} 
              onValueChange={(value) => setData({ ...data, experience: value })}
            >
              <div className="space-y-4">
                {[
                  { value: "Iniciante", desc: "Pouca ou nenhuma experiência" },
                  { value: "Intermediário", desc: "Pratico há alguns meses" },
                  { value: "Avançado", desc: "Pratico há mais de 2 anos" },
                  { value: "Atleta", desc: "Competidor ou ex-atleta" }
                ].map((level) => (
                  <Card
                    key={level.value}
                    className={`p-4 cursor-pointer transition-all ${
                      data.experience === level.value
                        ? "border-yellow-600 bg-yellow-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setData({ ...data, experience: level.value })}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={level.value} id={level.value} />
                      <div>
                        <label htmlFor={level.value} className="font-semibold cursor-pointer">
                          {level.value}
                        </label>
                        <p className="text-sm text-gray-600">{level.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Qual sua disponibilidade?</h2>
            </div>
            
            <RadioGroup 
              value={data.availability} 
              onValueChange={(value) => setData({ ...data, availability: value })}
            >
              <div className="space-y-4">
                {[
                  { value: "2-3x por semana", desc: "Horários flexíveis" },
                  { value: "4-5x por semana", desc: "Rotina mais intensa" },
                  { value: "Todos os dias", desc: "Máximo comprometimento" },
                  { value: "Fins de semana", desc: "Apenas sábado e domingo" }
                ].map((schedule) => (
                  <Card
                    key={schedule.value}
                    className={`p-4 cursor-pointer transition-all ${
                      data.availability === schedule.value
                        ? "border-yellow-600 bg-yellow-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setData({ ...data, availability: schedule.value })}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={schedule.value} id={schedule.value} />
                      <div>
                        <label htmlFor={schedule.value} className="font-semibold cursor-pointer">
                          {schedule.value}
                        </label>
                        <p className="text-sm text-gray-600">{schedule.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Qual seu investimento mensal?</h2>
              <p className="text-gray-600">Para alcançar seus objetivos</p>
            </div>
            
            <RadioGroup 
              value={data.budget} 
              onValueChange={(value) => setData({ ...data, budget: value })}
            >
              <div className="space-y-4">
                {[
                  { value: "R$ 500 - R$ 1.000", desc: "Plano básico online" },
                  { value: "R$ 1.000 - R$ 2.500", desc: "Plano intermediário" },
                  { value: "R$ 2.500 - R$ 5.000", desc: "Plano premium" },
                  { value: "R$ 5.000+", desc: "Plano VIP completo" }
                ].map((budget) => (
                  <Card
                    key={budget.value}
                    className={`p-4 cursor-pointer transition-all ${
                      data.budget === budget.value
                        ? "border-yellow-600 bg-yellow-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setData({ ...data, budget: budget.value })}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={budget.value} id={budget.value} />
                      <div>
                        <label htmlFor={budget.value} className="font-semibold cursor-pointer">
                          {budget.value}
                        </label>
                        <p className="text-sm text-gray-600">{budget.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Heart className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Como está sua saúde?</h2>
            </div>
            
            <RadioGroup 
              value={data.health} 
              onValueChange={(value) => setData({ ...data, health: value })}
            >
              <div className="space-y-4">
                {[
                  { value: "Excelente", desc: "Sem problemas de saúde" },
                  { value: "Boa", desc: "Algumas limitações menores" },
                  { value: "Regular", desc: "Alguns problemas a considerar" },
                  { value: "Precisa atenção", desc: "Acompanhamento médico necessário" }
                ].map((health) => (
                  <Card
                    key={health.value}
                    className={`p-4 cursor-pointer transition-all ${
                      data.health === health.value
                        ? "border-yellow-600 bg-yellow-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setData({ ...data, health: health.value })}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={health.value} id={health.value} />
                      <div>
                        <label htmlFor={health.value} className="font-semibold cursor-pointer">
                          {health.value}
                        </label>
                        <p className="text-sm text-gray-600">{health.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">O que mais te motiva?</h2>
            </div>
            
            <RadioGroup 
              value={data.motivation} 
              onValueChange={(value) => setData({ ...data, motivation: value })}
            >
              <div className="space-y-4">
                {[
                  "Melhorar minha saúde",
                  "Ficar mais bonito(a)",
                  "Ter mais energia",
                  "Aumentar autoestima",
                  "Ser um exemplo",
                  "Desafio pessoal"
                ].map((motivation) => (
                  <Card
                    key={motivation}
                    className={`p-4 cursor-pointer transition-all ${
                      data.motivation === motivation
                        ? "border-yellow-600 bg-yellow-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setData({ ...data, motivation: motivation })}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={motivation} id={motivation} />
                      <label htmlFor={motivation} className="font-semibold cursor-pointer">
                        {motivation}
                      </label>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <Heart className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Perfeito!</h2>
              <p className="text-gray-600">
                Sua avaliação está completa. Vamos para sua área personalizada!
              </p>
            </div>
            
            <Card className="p-6 bg-yellow-50 border-yellow-200">
              <h3 className="text-xl font-bold mb-4">Resumo da sua avaliação:</h3>
              <div className="text-left space-y-2">
                <p><strong>Nome:</strong> {data.name}</p>
                <p><strong>Objetivos:</strong> {data.goals.join(", ")}</p>
                <p><strong>Experiência:</strong> {data.experience}</p>
                <p><strong>Disponibilidade:</strong> {data.availability}</p>
              </div>
            </Card>
            
            <Button 
              size="lg" 
              onClick={completeAssessment}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-medium w-full"
            >
              <ArrowRight className="mr-2 w-5 h-5" />
              Ir para Dashboard
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return data.name && data.age && data.gender;
      case 2: return data.goals.length > 0;
      case 3: return data.experience;
      case 4: return data.availability;
      case 5: return data.budget;
      case 6: return data.health;
      case 7: return data.motivation;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6 max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Passo {step} de {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 mb-8">
          {renderStep()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Voltar
            </Button>
          )}
          
          {step < totalSteps && (
            <Button 
              onClick={handleNext}
              disabled={!isStepValid()}
              className="ml-auto bg-yellow-600 hover:bg-yellow-700"
            >
              Próximo
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
