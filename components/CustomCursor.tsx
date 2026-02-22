/* ============================================================
   TYPES
   ============================================================ */
interface MouseCoords {
  x: number;
  y: number;
}

interface CustomCursorProps {
  mouse: MouseCoords;
}

/* ============================================================
   COMPONENT — CustomCursor
   8px white dot, mix-blend-mode: difference
   ============================================================ */
export function CustomCursor({ mouse }: CustomCursorProps) {
  return (
    <div
      className="custom-cursor fixed w-2 h-2 rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[width,height] duration-200"
      style={{
        left: mouse.x,
        top: mouse.y,
        background: "rgba(255,255,255,0.9)",
      }}
    />
  );
}