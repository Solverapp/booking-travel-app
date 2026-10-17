import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import { useAuth } from "../../context/AuthContext";
import "./style.css";

const TABS = [
  { id: "overview", label: "Overview", icon: PersonOutlineOutlined },
  { id: "bookings", label: "Bookings", icon: ShoppingBagOutlined },
  { id: "settings", label: "Settings", icon: SettingsOutlined },
];

const initialsOf = (user) => {
  const letters = `${user?.firstname?.[0] ?? ""}${user?.lastname?.[0] ?? ""}`;
  return (letters || user?.email?.[0] || "T").toUpperCase();
};

const ProfileNav = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ");

  return (
    <nav className="profile-nav">
      <div className="profile-nav-user">
        <span className="profile-avatar">{initialsOf(user)}</span>
        <div className="profile-nav-user-info">
          <p>{fullName || "Traveler"}</p>
          <span>{user?.email}</span>
        </div>
      </div>

      <div className="profile-nav-items">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`profile-nav-item ${activeTab === id ? "is-active" : ""}`}
            onClick={() => onTabChange(id)}
          >
            <Icon className="profile-nav-icon" fontSize="inherit" />
            <span>{label}</span>
          </button>
        ))}

        <button
          type="button"
          className="profile-nav-item profile-nav-logout"
          onClick={logout}
        >
          <LogoutOutlined className="profile-nav-icon" fontSize="inherit" />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  );
};

export default ProfileNav;
