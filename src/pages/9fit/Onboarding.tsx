import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Heart, 
  Dumbbell, 
  Zap, 
  Activity, 
  ArrowRight,
  Sparkles,
  Target,
  Search
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

const goals = [
  { id: "lose_weight", label: "Lose Weight", icon: Heart },
  { id: "gain_muscle", label: "Gain Muscle", icon: Dumbbell },
  { id: "endurance", label: "Endurance", icon: Zap },
  { id: "flexibility", label: "Flexibility", icon: Activity },
];

const levels = ["Beginner", "Intermediate", "Advanced", "Athlete"];
const days = [2, 3, 4, 5, 6];

export default function NineFitOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState({
    goal: "",
    level: "",
    days: 0,
    weight: "",
    height: "",
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleGoalSelect = (goalId: string) => {
    setData({ ...data, goal: goalId });
    setTimeout(() => setStep(2), 300);
  };

  const handleLevelSelect = (level: string) => {
    setData({ ...data, level });
    setTimeout(() => setStep(3), 300);
  };

  const handleDaysSelect = (numDays: number) => {
    setData({ ...data, days: numDays });
    setTimeout(() => setStep(4), 300);
  };

  const handleMetricsSubmit = () => {
    setStep(5);
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  const handleEnterDashboard = () => {
    navigate("/9fit");
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-foreground mb-2">
              Primary Objective
            </h2>
            <p className="text-gray-400 mb-8">What is your main goal?</p>

            <div className="grid grid-cols-2 gap-4">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleGoalSelect(goal.id)}
                  className={`p-6 bg-dark-800 border rounded-sm flex flex-col items-center gap-3 transition-all ${
                    data.goal === goal.id
                      ? "border-neon-400 bg-neon-400/10"
                      : "border-dark-700 hover:border-neon-400/50"
                  }`}
                >
                  <goal.icon className="w-8 h-8 text-neon-400" />
                  <span className="text-sm font-bold uppercase text-foreground">
                    {goal.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-foreground mb-2">
              Experience Level
            </h2>
            <p className="text-gray-400 mb-8">Define your current baseline.</p>

            <div className="grid grid-cols-2 gap-4">
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => handleLevelSelect(level)}
                  className={`p-4 rounded-sm font-bold uppercase text-sm transition-all ${
                    data.level === level
                      ? "bg-neon-400 text-primary-foreground"
                      : "bg-dark-800 border border-dark-700 text-foreground hover:border-neon-400/50"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-foreground mb-2">
              Commitment
            </h2>
            <p className="text-gray-400 mb-2">Days per week available for training.</p>
            <p className="text-xs text-gray-500 uppercase mb-8">
              {data.days > 0 ? `${data.days} Days / Week Selected` : "Select your availability"}
            </p>

            <div className="flex justify-center gap-4">
              {days.map((numDays) => (
                <button
                  key={numDays}
                  onClick={() => handleDaysSelect(numDays)}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-full font-black text-xl transition-all ${
                    data.days === numDays
                      ? "bg-neon-400 text-primary-foreground glow-neon"
                      : "bg-dark-800 border border-dark-700 text-foreground hover:border-neon-400"
                  }`}
                >
                  {numDays}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-foreground mb-2">
              Metrics (Optional)
            </h2>
            <p className="text-gray-400 mb-8">Calibrate your profile for precision.</p>

            <div className="space-y-4 mb-8">
              <input
                type="number"
                value={data.weight}
                onChange={(e) => setData({ ...data, weight: e.target.value })}
                placeholder="Estimated Weight (kg)"
                className="w-full bg-dark-800 border border-dark-700 rounded-sm px-4 py-4 text-foreground placeholder:text-gray-500 focus:border-neon-400 focus:outline-none"
              />
              <input
                type="number"
                value={data.height}
                onChange={(e) => setData({ ...data, height: e.target.value })}
                placeholder="Estimated Height (cm)"
                className="w-full bg-dark-800 border border-dark-700 rounded-sm px-4 py-4 text-foreground placeholder:text-gray-500 focus:border-neon-400 focus:outline-none"
              />
            </div>

            <button
              onClick={handleMetricsSubmit}
              className="w-full border border-neon-400 text-neon-400 font-bold py-4 rounded-sm hover:bg-neon-400 hover:text-primary-foreground transition-all"
            >
              Skip / Continue
            </button>
          </div>
        );

      case 5:
        return (
          <div className="animate-fade-in text-center">
            {isAnalyzing ? (
              <>
                <Sparkles className="w-12 h-12 text-neon-400 mx-auto mb-6 animate-spin-slow" />
                <h2 className="text-2xl font-bold uppercase text-foreground mb-4">
                  AI Analysis In Progress...
                </h2>
                <p className="text-sm text-gray-500">
                  Consulting global database for "{goals.find(g => g.id === data.goal)?.label}"...
                </p>
              </>
            ) : (
              <>
                <div className="bg-dark-800 border border-neon-400/30 rounded-sm p-6 mb-8">
                  <div className="flex items-center gap-2 justify-center mb-4">
                    <Target className="w-4 h-4 text-neon-400" />
                    <span className="text-xs font-bold uppercase text-neon-400">
                      9FIT Intelligence
                    </span>
                  </div>
                  
                  <p className="text-lg leading-relaxed text-gray-200 mb-4">
                    Based on your goal of <span className="text-neon-400 font-bold">{goals.find(g => g.id === data.goal)?.label}</span> and 
                    <span className="text-neon-400 font-bold"> {data.level}</span> experience level, 
                    I've created a personalized {data.days}-day program optimized for maximum results.
                  </p>
                  
                  <div className="flex items-center gap-1 justify-center text-xs text-gray-500">
                    <Search className="w-3 h-3" />
                    <span>Verified Source</span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold uppercase text-foreground mb-6">
                  Plan Generated
                </h2>

                <button
                  onClick={handleEnterDashboard}
                  className="w-full bg-neon-400 text-primary-foreground font-bold py-4 rounded-sm flex items-center justify-center gap-2 animate-pulse hover:animate-none hover:opacity-90 transition-all"
                >
                  Enter Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-12">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              s <= step ? "bg-neon-400" : "bg-dark-700"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {renderStep()}
      </div>
    </div>
  );
}
