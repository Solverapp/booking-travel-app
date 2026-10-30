import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BottomSheet from "../bottomsheet/BottomSheet";
import useMediaQuery from "../../utils/useMediaQuery";
import { useAuth } from "../../context/AuthContext";
import { useAuthPrompt } from "../../context/authPrompt";
import "./authPrompt.css";

const serviceLabel = (service) => {
  if (service === "flight") return "flight";
  if (service === "hotel") return "hotel";
  if (service === "tour") return "tour";
  return "";
};

const AuthRequiredPrompt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 968px)");
  const { user } = useAuth();
  const { prompt, closeAuthPrompt } = useAuthPrompt();
  const open = Boolean(prompt);
  const signInRef = useRef(null);
  const previousFocusRef = useRef(null);

  const service = serviceLabel(prompt?.service);
  const message = service
    ? `Create an account or sign in to continue with this ${service}.`
    : "Create an account or sign in to continue with your booking.";

  useEffect(() => {
    if (user && prompt) closeAuthPrompt();
  }, [user, prompt, closeAuthPrompt]);

  useEffect(() => {
    if (!open || isMobile) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event) => {
      if (event.key === "Escape") closeAuthPrompt();
    };
    window.addEventListener("keydown", onKey);
    signInRef.current?.focus?.({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      const target = previousFocusRef.current;
      if (target && typeof target.focus === "function" && document.contains(target)) {
        target.focus();
      }
    };
  }, [open, isMobile, closeAuthPrompt]);

  const handleSignIn = () => {
    const from = prompt?.from || `${location.pathname}${location.search}`;
    closeAuthPrompt();
    navigate("/login", { state: { from } });
  };

  const actions = (
    <div className="authprompt-actions">
      <button type="button" className="authprompt-later" onClick={closeAuthPrompt}>
        Later
      </button>
      <button
        type="button"
        className="authprompt-primary"
        onClick={handleSignIn}
        ref={signInRef}
      >
        Sign in
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={closeAuthPrompt}
        title="Sign in required"
        footer={actions}
        initialFocusRef={signInRef}
        className="authprompt-sheet"
      >
        <div className="authprompt-copy">
          <span className="authprompt-icon" aria-hidden="true">
            <LockOutlinedIcon />
          </span>
          <p className="authprompt-text">{message}</p>
        </div>
      </BottomSheet>
    );
  }

  return (
    <>
      <div
        className={`authprompt-overlay${open ? " is-open" : ""}`}
        onClick={closeAuthPrompt}
        aria-hidden="true"
      />
      <section
        className={`authprompt-modal${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-labelledby="authprompt-title"
        inert={!open}
      >
        <span className="authprompt-icon" aria-hidden="true">
          <LockOutlinedIcon />
        </span>
        <h2 className="authprompt-title" id="authprompt-title">
          Sign in required
        </h2>
        <p className="authprompt-text">{message}</p>
        {actions}
      </section>
    </>
  );
};

export default AuthRequiredPrompt;
