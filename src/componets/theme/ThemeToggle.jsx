import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { useTheme } from "../../context/useTheme";
import "./style.css";

const ThemeToggle = ({ showLabel = false, className = "" }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      className={`theme-toggle${showLabel ? " theme-toggle--labeled" : ""}${
        className ? ` ${className}` : ""
      }`}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? (
        <LightModeOutlined fontSize="inherit" />
      ) : (
        <DarkModeOutlined fontSize="inherit" />
      )}
      {showLabel ? (
        <span>{isDark ? "Light theme" : "Dark theme"}</span>
      ) : null}
    </button>
  );
};

export default ThemeToggle;
