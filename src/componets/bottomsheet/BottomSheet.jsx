import { useEffect, useRef, useCallback } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import "./style.css";

const MOBILE_BREAKPOINT = 968;

/* Нижняя шторка.
   Оболочка (оверлей + панель) всегда в DOM — тогда transform-анимация
   открывается/закрывается без лишних ререндеров. Содержимое помечено
   inert, пока шторка закрыта: не ловит фокус и не видна скринридерам.
   Дети монтирует родитель — здесь только обвязка и жизненный цикл. */
const BottomSheet = ({ open, onClose, title, footer, children }) => {
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  // Запоминаем, что открыло шторку, и возвращаем туда фокус при закрытии.
  // Иначе после inert фокус уезжает в <body> и клавиатурный пользователь
  // теряет место в документе.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    return () => {
      const el = triggerRef.current;
      if (el && typeof el.focus === "function" && document.contains(el)) {
        el.focus();
      }
    };
  }, [open]);

  // Не даём странице скроллиться под шторкой
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // На широком экране шторка не нужна
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) onClose?.();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Фокус на крестик при открытии — клавиатурная навигация
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const close = useCallback(() => onClose?.(), [onClose]);

  return (
    <>
      <div
        className={`bottomsheet-overlay${open ? " is-visible" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <div
        className={`bottomsheet${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label={open ? title : undefined}
        /* aria-hidden намеренно не ставим: он конфликтует с фокусом внутри
           («Blocked aria-hidden... retained focus»). inert и так убирает
           панель и из фокуса, и из дерева доступности. */
        inert={!open}
      >
        <div className="bottomsheet-handle" aria-hidden="true" />

        <div className="bottomsheet-header">
          <h3 className="bottomsheet-title">{title}</h3>
          <button
            type="button"
            className="bottomsheet-close"
            aria-label="Close"
            onClick={close}
            ref={closeRef}
          >
            <CloseOutlinedIcon fontSize="small" />
          </button>
        </div>

        <div className="bottomsheet-body">{children}</div>

        {footer ? <div className="bottomsheet-footer">{footer}</div> : null}
      </div>
    </>
  );
};

export default BottomSheet;
