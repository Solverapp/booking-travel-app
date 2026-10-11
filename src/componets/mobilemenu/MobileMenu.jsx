import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "./style.css";
import hotel from "../../img/icons/Navicons/building-4.svg";
import tours from "../../img/icons/Navicons/sun.svg";
import airline from "../../img/icons/Navicons/airplane.svg";
import profil from "../../img/icons/Navicons/profile-circle.svg";

const MENU_CLOSE_ON_RESIZE = 1200;

const MobileMenu = ({ user }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > MENU_CLOSE_ON_RESIZE) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`nav-burger${open ? " is-open" : ""}`}
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`mobile-overlay${open ? " is-visible" : ""}`}
        onClick={() => setOpen(false)}
      />

      <nav className={`mobile-menu${open ? " is-open" : ""}`}>
        <NavLink to="/hotels" onClick={() => setOpen(false)}>
          <img src={hotel} alt="" />
          <p>Hotels</p>
        </NavLink>
        <NavLink to="/tours" onClick={() => setOpen(false)}>
          <img src={tours} alt="" />
          <p>Tours</p>
        </NavLink>
        <NavLink to="/" onClick={() => setOpen(false)}>
          <img src={airline} alt="" />
          <p>Flights</p>
        </NavLink>
        <NavLink to={user ? "/profile" : "/login"} onClick={() => setOpen(false)}>
          <img src={profil} alt="" />
          <p>{user?.firstname || "Log in"}</p>
        </NavLink>
      </nav>
    </>
  );
};

export default MobileMenu;
