import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import ThemeToggle from "../theme/ThemeToggle.jsx";
import "./style.css";
import logo from "../../img/logo/Solver.png";
import profil from "../../img/icons/Navicons/profile-circle.svg";

const NavBar = () => {
  const { user } = useAuth();
  return (
    <div className="nav">
      <div className="logo">
        <img src={logo} alt="" />
      </div>
      <div className="nav-actions">
        <NavLink to={user ? "/profile" : "/login"} className="nav-user">
          <div className="nav-list-item">
            <img src={profil} className="nav-icons" alt="" />
            <p className="nav-user-name">{user?.firstname || "Log in"}</p>
          </div>
        </NavLink>
        <ThemeToggle />
      </div>
    </div>
  );
};

export default NavBar;
