import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronRight } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { LiveClassCard } from "@/components/9fit/LiveClassCard";
import { TribeCard } from "@/components/9fit/TribeCard";

const liveClasses = [
  {
    id: "1",
    title: "HIIT Ignition",
    instructor: "Coach Rex",
    duration: "30 min",
    intensity: "High" as const,
    bgColor: "bg-red-900",
  },
  {
    id: "2",
    title: "Mobility Flow",
    instructor: "Sarah J.",
    duration: "20 min",
    intensity: "Low" as const,
    bgColor: "bg-blue-900",
  },
  {
    id: "3",
    title: "Strength Core",
    instructor: "Mike T.",
    duration: "45 min",
    intensity: "Medium" as const,
    bgColor: "bg-purple-900",
  },
];

const tribes = [
  { id: "1", name: "Run Club", members: 1204, color: "bg-green-600" },
  { id: "2", name: "CrossFit", members: 892, color: "bg-orange-600" },
  { id: "3", name: "Yoga", members: 540, color: "bg-purple-600" },
];

export default function NineFitTrain() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate week days
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Operations
        </h1>
      </div>

      {/* Calendar Strip */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {weekDays.map((day) => {
            const isSelected =
              format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
            const isToday =
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center w-12 h-16 rounded-sm border transition-all flex-shrink-0 ${
                  isSelected
                    ? "bg-neon-400 border-neon-400 text-primary-foreground"
                    : "bg-dark-800 border-dark-700 text-gray-500 hover:border-dark-600"
                }`}
              >
                <span className="text-[10px] uppercase font-bold">
                  {format(day, "EEE")}
                </span>
                <span className="text-xl font-black">{format(day, "d")}</span>
                {isToday && !isSelected && (
                  <div className="w-1 h-1 bg-neon-400 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Classes */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Live Classes
          </h2>
          <button className="text-[10px] text-neon-400 uppercase font-bold flex items-center gap-1">
            View Schedule
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {liveClasses.map((classItem) => (
            <LiveClassCard
              key={classItem.id}
              title={classItem.title}
              instructor={classItem.instructor}
              duration={classItem.duration}
              intensity={classItem.intensity}
              bgColor={classItem.bgColor}
            />
          ))}
        </div>
      </div>

      {/* Tribes */}
      <div className="px-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Tribes
        </h2>

        <div className="space-y-3">
          {tribes.map((tribe) => (
            <TribeCard
              key={tribe.id}
              name={tribe.name}
              members={tribe.members}
              color={tribe.color}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
