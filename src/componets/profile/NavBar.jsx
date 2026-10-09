import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./style.css";
import { SettingsOutlined, ShoppingBagOutlined,PersonOutlineOutlined, Logout } from "@mui/icons-material";
const NavBar = ({onTabChange}) => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState("profile");
    

    const handleTabClick = (e) => {
  setActiveTab(e.currentTarget.name);
  onTabChange(e.currentTarget.name);
 
};
    
    return ( <nav id="navbar">
  <ul className="navbar-items flexbox-col">
    
    <li className="navbar-item flexbox-left">
      <a name="profile" className={`navbar-item-inner flexbox-left ${activeTab === "profile" ? "current" : ""}`} onClick={handleTabClick}>
        <div className="navbar-item-inner-icon-wrapper flexbox">
          <PersonOutlineOutlined/>
        </div>
        <span className="link-text">Profile</span>
      </a>
    </li>
    <li className="navbar-item flexbox-left">
      <a name="set" className={`navbar-item-inner flexbox-left ${activeTab === "set" ? "current" : ""}`} onClick={handleTabClick}>
        <div className="navbar-item-inner-icon-wrapper flexbox">
          <SettingsOutlined/>
        </div>
        <span className="link-text">Setings</span>
      </a>
    </li>
    <li className="navbar-item flexbox-left">
      <a name="book" className={`navbar-item-inner flexbox-left ${activeTab === "book" ? "current" : ""}`} onClick={handleTabClick}>
        <div className="navbar-item-inner-icon-wrapper flexbox">
          <ShoppingBagOutlined/>
        </div>
        <span className="link-text">Bookings</span>
      </a>
    </li>
    <li className="navbar-item flexbox-left">
      <a onClick={logout} className="navbar-item-inner flexbox-left">
        <div className="navbar-item-inner-icon-wrapper flexbox">
          <Logout/>
        </div>
        <span className="link-text">Log out</span>
      </a>
    </li>
    
  </ul>
</nav> );
}
 
export default NavBar;