import { NavLink } from "react-router-dom";
import  {useAuth}  from '../../context/AuthContext.jsx';
import MobileMenu from "../mobilemenu/MobileMenu.jsx";
import "./style.css";
import logo from "../../img/logo/Solver.png";
import ru from "../../img/icons/Navicons/ru.svg";
import hotel from "../../img/icons/Navicons/building-4.svg";
import tours from "../../img/icons/Navicons/sun.svg";
import airline from "../../img/icons/Navicons/airplane.svg";
import estate from "../../img/icons/Navicons/buildings-2.svg";
import banks from "../../img/icons/Navicons/wallet-2.svg";
import profil from "../../img/icons/Navicons/profile-circle.svg";
import notify from "../../img/icons/Navicons/notification-bing.svg";
import message from "../../img/icons/Navicons/message-question.svg";

const NavBar = () => {
  const { user, logout } = useAuth();
  return (
    <div className="nav">
      <div className="logo">
        <img src={logo} alt="" />
      </div>
      <div className="nav-list">
        <div className="nav-list-item">
          <img src={ru} className="nav-icons-flag" />
        </div>
        <NavLink to={"hotels"}>
        <div className="nav-list-item">
          
            
          
          <img src={hotel} className="nav-icons" />
          <p>Hotels</p>
        </div>
        </NavLink>
        <div className="nav-list-item">
          <img src={tours} className="nav-icons" />
          <p>Tours</p>
        </div>
        <div className="nav-list-item">
          <img src={airline} className="nav-icons" />
          <p>Flights</p>
        </div>
        {/* <div className="nav-list-item">
          <img src={estate} className="nav-icons" />
          <p>Real Estate</p>
        </div>
        <div className="nav-list-item">
          <img src={banks} className="nav-icons" />
          <p>Finance</p>
        </div> */}
        <NavLink to={user? "/profile" : "/login"}>

           <div className="nav-list-item">
          <img src={profil} className="nav-icons" />
          <p>{user?.firstname || "Log in"}</p>
        </div>
        </NavLink>
       
        <div className="nav-list-item">
          <img src={notify} className="nav-icons" />
        </div>
        <div className="nav-list-item-end">
          <img src={message} className="nav-icons" />
        </div>
      </div>
      <MobileMenu user={user} />
    </div>
  );
};

export default NavBar;
