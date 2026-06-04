import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import UserSearch from "./UserSearch";
import NotificationBell from "./NotificationBell";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const Header = () => {
  const { isAdmin } = useIsAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="px-3 py-1 flex items-center justify-between gap-3">
        <Link to="/">
          <img src={logo} alt="Alley Cat" className="h-12" />
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin/alley-updates"
              title="Review alley change requests"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
            </Link>
          )}
          <UserSearch />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
};

export default Header;
