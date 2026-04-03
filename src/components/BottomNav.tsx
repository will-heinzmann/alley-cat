import { Link, useLocation } from "react-router-dom";
import { MapPin, Target, Trophy, PlusCircle, Rss, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "FEED", icon: Rss },
    { path: "/alleys", label: "ALLEYS", icon: MapPin },
    { path: "/log", label: "LOG", icon: PlusCircle },
    { path: "/leaderboard", label: "BOARD", icon: Trophy },
    { path: user ? `/bowler/${user.id}` : "/auth", label: "ME", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-primary bg-card">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.label === "ME" && location.pathname.startsWith("/bowler/") && user && location.pathname.includes(user.id));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-all ${
                isActive ? "text-primary neon-text" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="font-pixel text-[7px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
