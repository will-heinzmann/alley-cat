import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "Feed" },
    { path: "/alleys", label: "Alleys" },
    { path: "/log", label: "Log" },
    { path: "/league", label: "League" },
    { path: "/leaderboard", label: "Board" },
    { path: user ? `/bowler/${user.id}` : "/auth", label: "Me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.label === "Me" && location.pathname.startsWith("/bowler/") && user && location.pathname.includes(user.id));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs px-2 py-1 transition-colors ${
                isActive
                  ? "text-primary font-bold underline"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              [{item.label}]
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
