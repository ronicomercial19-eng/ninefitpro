import { Play } from "lucide-react";

interface LiveClassCardProps {
  title: string;
  instructor: string;
  duration: string;
  intensity: "Low" | "Medium" | "High";
  bgColor: string;
  onClick?: () => void;
}

export function LiveClassCard({
  title,
  instructor,
  duration,
  intensity,
  bgColor,
  onClick,
}: LiveClassCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-48 h-32 rounded-sm overflow-hidden group flex-shrink-0 ${bgColor}`}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

      {/* Duration Badge */}
      <div className="absolute top-2 right-2 bg-black/80 text-foreground text-[9px] font-bold px-2 py-1 rounded-sm">
        {duration}
      </div>

      {/* Play Button (on hover) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 bg-neon-400 rounded-full flex items-center justify-center">
          <Play className="w-5 h-5 text-primary-foreground fill-current" />
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h4 className="text-sm font-bold uppercase text-foreground truncate">
          {title}
        </h4>
        <p className="text-[10px] text-gray-400 uppercase">
          {instructor} • {intensity}
        </p>
      </div>
    </button>
  );
}
