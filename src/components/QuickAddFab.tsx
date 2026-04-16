import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const QuickAddFab = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link
      to="/log"
      className="fixed bottom-20 right-4 z-50 md:hidden w-14 h-14 flex items-center justify-center bg-primary text-primary-foreground text-2xl font-bold border-2 border-primary-foreground shadow-lg hover:opacity-90 active:scale-95 transition-transform"
      aria-label="Log a game"
    >
      +
    </Link>
  );
};

export default QuickAddFab;
