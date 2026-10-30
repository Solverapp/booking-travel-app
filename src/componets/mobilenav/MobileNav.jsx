import { NavLink, useLocation } from "react-router-dom";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import { useAuth } from "../../context/AuthContext.jsx";
import ThemeToggle from "../theme/ThemeToggle.jsx";
import "./style.css";

const HIDDEN_ROUTES = ["/login", "/register"];

const MobileNav = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  const accountPath = user ? "/profile" : "/login";
  const accountLabel = user ? "Profile" : "Log in";
  const AccountIcon = user ? PersonOutlineOutlined : LoginOutlined;
  

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `mobile-bottom-nav-btn${isActive ? " is-active" : ""}`
        }
        aria-label="Home"
      >
        <ExploreOutlinedIcon fontSize="inherit" />
      </NavLink>
      {user && (
      <NavLink
    to="/profile?tab=bookings"
    className={({ isActive }) =>
      `mobile-bottom-nav-btn${isActive ? " is-active" : ""}`
    }
    aria-label="My bookings"
  >
    <LocalMallOutlinedIcon fontSize="inherit" />
  </NavLink>
    )}

      <ThemeToggle className="mobile-bottom-nav-theme" />

      <NavLink
        to={accountPath}
        className={({ isActive }) =>
          `mobile-bottom-nav-btn${isActive ? " is-active" : ""}`
        }
        aria-label={accountLabel}
      >
        <AccountIcon fontSize="inherit" />
      </NavLink>
    </nav>
  );
};

export default MobileNav;
