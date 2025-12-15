import { Users } from "lucide-react";

interface TribeCardProps {
  name: string;
  members: number;
  color: string;
  onJoin?: () => void;
}

export function TribeCard({ name, members, color, onJoin }: TribeCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-dark-800 border border-dark-700 rounded-sm hover:border-dark-600 transition-colors">
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-sm flex items-center justify-center ${color}`}
      >
        <Users className="w-6 h-6 text-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1">
        <h4 className="text-sm font-bold uppercase text-foreground">{name}</h4>
        <p className="text-[10px] text-gray-500 uppercase">
          {members.toLocaleString()} Operatives
        </p>
      </div>

      {/* Join Button */}
      <button
        onClick={onJoin}
        className="text-neon-400 border border-neon-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-sm hover:bg-neon-400 hover:text-primary-foreground transition-colors"
      >
        Join
      </button>
    </div>
  );
}
