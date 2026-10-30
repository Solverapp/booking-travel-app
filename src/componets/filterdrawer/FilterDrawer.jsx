import { useState, useEffect, useCallback } from "react";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import "./style.css";

const DESKTOP_BREAKPOINT = 1200;

const FilterDrawer = ({
  children,
  label = "Filters",
  resultCount = null,
  resultNoun = "result",
  resultLoading = false,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > DESKTOP_BREAKPOINT) setOpen(false);
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

  const close = useCallback(() => setOpen(false), []);

  const hasResultCount = Number.isFinite(resultCount);
  const resultNounLabel = `${resultNoun}${resultCount === 1 ? "" : "s"}`;
  const resultText = resultLoading
    ? "Updating results…"
    : resultCount === 0
      ? `No ${resultNounLabel} found`
      : `Show ${resultCount} ${resultNounLabel}`;

  return (
    <div className="filter-drawer">
      <button
        type="button"
        className="filter-toggle-btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <TuneOutlinedIcon fontSize="small" />
        <span>{label}</span>
      </button>

      <div
        className={`filter-drawer-overlay${open ? " is-visible" : ""}`}
        onClick={close}
      />

      <div className={`filter-wrapper${open ? " is-open" : ""}`}>
        <div className="filter-drawer-header">
          <button
            type="button"
            className="filter-drawer-close"
            aria-label="Close filters"
            onClick={close}
          >
            <CloseOutlinedIcon fontSize="small" />
          </button>
        </div>
        <div className="filter-drawer-body">{children}</div>

        {hasResultCount && (
          <div className="filter-drawer-footer">
            <button
              type="button"
              className="filter-drawer-apply"
              onClick={close}
              aria-busy={resultLoading ? "true" : undefined}
            >
              <span aria-live="polite">{resultText}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterDrawer;
