import { useEffect, useState } from "react";

/* ============================================================
   TYPES
   ============================================================ */
interface MouseCoords {
  x: number;
  y: number;
}

interface MousePositionResult {
  mouse: MouseCoords;
  cardMouse: MouseCoords;
}

/* ============================================================
   HOOK — useMousePosition
   Tracks:
   - Global mouse position
   - Mouse position relative to cardRef
   ============================================================ */
export function useMousePosition(
  cardRef: React.RefObject<HTMLDivElement | null>
): MousePositionResult {
  const [mouse, setMouse] = useState<MouseCoords>({ x: 0, y: 0 });
  const [cardMouse, setCardMouse] = useState<MouseCoords>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;

      // Global mouse
      setMouse({ x: clientX, y: clientY });

      // Relative to card
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCardMouse({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, [cardRef]);

  return { mouse, cardMouse };
}