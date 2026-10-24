import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./searchUi.css";

const VIEWPORT_PADDING = 12;
const OFFSET = 8;

const AnchoredPopover = ({
  open,
  anchorRef,
  onClose,
  children,
  className = "",
  matchWidth = false,
  preferredWidth,
  align = "start",
  offset = OFFSET,
  viewportPadding = VIEWPORT_PADDING,
  allowOverlap = false,
  ariaLabel = "Suggestions",
}) => {
  const popupRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const frameRef = useRef(0);
  const wasOpenRef = useRef(false);
  const focusInsideRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    const popup = popupRef.current;
    if (!anchor || !popup) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxViewportHeight = Math.max(0, viewportHeight - viewportPadding * 2);
    const spaceBelow = Math.max(
      0,
      viewportHeight - anchorRect.bottom - offset - viewportPadding,
    );
    const spaceAbove = Math.max(0, anchorRect.top - offset - viewportPadding);
    const fitsBelow = spaceBelow >= popupRect.height;
    const fitsAbove = spaceAbove >= popupRect.height;
    const placement =
      fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove) ? "bottom" : "top";
    const available = placement === "bottom" ? spaceBelow : spaceAbove;
    const height = allowOverlap
      ? Math.min(popupRect.height, maxViewportHeight)
      : Math.min(popupRect.height, available, maxViewportHeight);
    const width = matchWidth
      ? anchorRect.width
      : preferredWidth
        ? Math.min(preferredWidth, viewportWidth - viewportPadding * 2)
        : popupRect.width;

    let left = anchorRect.left;
    if (align === "center") left = anchorRect.left + anchorRect.width / 2 - width / 2;
    if (align === "end") left = anchorRect.right - width;

    const maxLeft = Math.max(
      viewportPadding,
      viewportWidth - width - viewportPadding,
    );
    left = Math.min(Math.max(left, viewportPadding), maxLeft);

    const rawTop =
      placement === "bottom"
        ? anchorRect.bottom + offset
        : anchorRect.top - height - offset;
    const maxTop = Math.max(
      viewportPadding,
      viewportHeight - height - viewportPadding,
    );
    const top = Math.min(Math.max(rawTop, viewportPadding), maxTop);

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    if (width) {
      popup.style.width = `${width}px`;
    } else {
      popup.style.removeProperty("width");
    }
    popup.style.maxHeight = `${Math.max(0, Math.min(height, maxViewportHeight))}px`;
    popup.style.visibility = "visible";
  }, [
    align,
    allowOverlap,
    anchorRef,
    matchWidth,
    offset,
    preferredWidth,
    viewportPadding,
  ]);

  const scheduleUpdate = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      updatePosition();
    });
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    updatePosition();
    const popup = popupRef.current;
    const anchor = anchorRef?.current;
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;

    if (popup) observer?.observe(popup);
    if (anchor) observer?.observe(anchor);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [open, anchorRef, scheduleUpdate, updatePosition]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;

    const active = document.activeElement;
    const anchor = anchorRef?.current;
    const activeInsidePopup = popupRef.current?.contains(active);
    const shouldReturnFocus =
      focusInsideRef.current &&
      (active === document.body || active == null || activeInsidePopup);

    focusInsideRef.current = false;
    if (shouldReturnFocus) {
      anchor?.focus?.({ preventScroll: true });
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (popupRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onCloseRef.current?.();
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      focusInsideRef.current = true;
      onCloseRef.current?.();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={`search-popover ${className}`.trim()}
      role="dialog"
      aria-label={ariaLabel}
      onFocusCapture={() => {
        focusInsideRef.current = true;
      }}
    >
      {children}
    </div>,
    document.body,
  );
};

export default AnchoredPopover;
