import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import UserSearch from "./UserSearch";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="px-3 py-1 flex items-center justify-between gap-3">
        <Link to="/">
          <img src={logo} alt="Alley Cat" className="h-12" />
        </Link>
        <UserSearch />
      </div>
    </header>
  );
};

export default Header;
