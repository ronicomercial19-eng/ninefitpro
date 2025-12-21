import { useState } from "react";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const menuItems = [
  { icon: Bell, label: "Notifications", path: "/9fit/settings/notifications" },
  { icon: Shield, label: "Privacy", path: "/9fit/settings/privacy" },
  { icon: CreditCard, label: "Subscription", path: "/9fit/premium" },
  { icon: HelpCircle, label: "Help & Support", path: "/9fit/support" },
];

export default function NineFitProfile() {
  const navigate = useNavigate();
  const [user] = useState({
    name: "Operative 9FIT",
    email: "user@9fit.app",
    level: 12,
    xp: 8500,
    workouts: 45,
    streak: 7,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/9fit/login");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Profile
        </h1>
      </div>

      {/* Digital ID Card */}
      <div className="px-4 mb-8">
        <div className="bg-gradient-to-br from-dark-800 to-dark-700 border border-dark-600 rounded-sm p-6 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-32 h-32 border border-foreground rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 border border-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 bg-dark-600 rounded-sm flex items-center justify-center">
                <User className="w-10 h-10 text-gray-500" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-neon-400 rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-lg font-black uppercase text-foreground">
                {user.name}
              </h2>
              <p className="text-xs text-gray-500 mb-3">{user.email}</p>

              <div className="flex gap-4">
                <div>
                  <p className="text-xl font-black text-neon-400">{user.level}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Level</p>
                </div>
                <div>
                  <p className="text-xl font-black text-foreground">{user.xp.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500 uppercase">XP</p>
                </div>
                <div>
                  <p className="text-xl font-black text-foreground">{user.workouts}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Workouts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-neon-400 border border-neon-400 px-2 py-1 rounded-sm">
              LVL {user.level}
            </span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4">
        <div className="bg-dark-800 border border-dark-700 rounded-sm overflow-hidden divide-y divide-dark-700">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 p-4 hover:bg-dark-700 transition-colors"
            >
              <item.icon className="w-5 h-5 text-gray-500" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                {item.label}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 mt-4 bg-dark-800 border border-dark-700 rounded-sm hover:bg-red-500/10 hover:border-red-500/30 transition-colors group"
        >
          <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-500" />
          <span className="text-sm font-medium text-foreground group-hover:text-red-500">
            Logout
          </span>
        </button>
      </div>

      {/* Version */}
      <div className="text-center mt-8">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">
          9FIT PRO v2.0.0
        </p>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
