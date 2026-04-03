import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="px-3 py-1">
        <Link to="/">
          <img src={logo} alt="Alley Cat" className="h-9" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
