"use client";
import { useState, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CustomCursor } from "../CustomCursor";
import { useMousePosition } from "@/hooks/useMouseTracker";

// ─────────────────────────────────────────────────────────────
// MINIMAL <style> — only what Tailwind can't express:
//   custom keyframes, CSS vars, radial gradients, shimmer,
//   ::placeholder weight, ::after shimmer sweep, mix-blend-mode
// ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');

  body { background: #000; overflow: hidden; font-family: 'Outfit', -apple-system, sans-serif; }

  @keyframes drift1 {
    0%,100% { transform: translate(0,0); }
    40%     { transform: translate(14px,-22px); }
    70%     { transform: translate(-8px,10px); }
  }
  @keyframes drift2 {
    0%,100% { transform: translate(0,0); }
    50%     { transform: translate(-20px,-18px); }
  }

  .anim-drift1          { animation: drift1 11s ease-in-out infinite; }
  .anim-drift2          { animation: drift2 14s ease-in-out infinite; }
  .anim-drift1-rev      { animation: drift1 18s ease-in-out infinite reverse; }

  /* Spotlight: radial gradient that follows cursor */
  .spotlight {
    background: radial-gradient(circle at center, rgba(255,255,255,0.065) 0%, rgba(180,140,255,0.03) 30%, transparent 65%);
    transition: left 0.07s ease-out, top 0.07s ease-out;
  }

  /* Film grain via SVG feTurbulence */
  .noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
  }

  /* Hairline rules: gradient fade in/out */
  .hairline {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.045) 20%, rgba(255,255,255,0.045) 80%, transparent);
  }

  /* Orb radial gradients */
  .orb-purple { background: radial-gradient(circle, rgba(110,70,240,0.09), transparent 70%); }
  .orb-white  { background: radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%); }
  .orb-blue   { background: radial-gradient(circle, rgba(60,140,255,0.07),  transparent 70%); }

  /* Card surface spotlight (follows mouse via CSS vars) */
  .card-light {
    background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.055), transparent 70%);
  }

  /* Card border rim highlight (mask trick — only border area visible) */
  .card-rim {
    padding: 1px;
    background: radial-gradient(180px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.18), transparent 70%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  /* Heading gradient text */
  .heading-gradient {
    background: linear-gradient(160deg, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.42) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Input placeholder styling */
  .ghost-input::placeholder { color: rgba(255,255,255,0.16); font-weight: 300; }
  .ghost-input:focus {
    border-color: rgba(255,255,255,0.2) !important;
    background: rgba(255,255,255,0.06) !important;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.035);
    outline: none;
  }

  /* Button shimmer sweep on hover */
  .shimmer-btn::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%);
    transform: translateX(-120%);
    transition: none;
  }
  .shimmer-btn:not(:disabled):hover::after {
    transform: translateX(120%);
    transition: transform 0.55s ease;
  }

  /* Cursor: mix-blend-mode not in Tailwind */
  .custom-cursor { mix-blend-mode: difference; }
`;


// ─────────────────────────────────────────────────────────────
// COMPONENT — GlobalSpotlight
// 700px radial glow, trails cursor with 70ms lag
// ─────────────────────────────────────────────────────────────
function GlobalSpotlight({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <div
      className="spotlight fixed pointer-events-none z-[1] w-[700px] h-[700px] rounded-full -translate-x-1/2 -translate-y-1/2 blur-[1px]"
      style={{ left: mouse.x, top: mouse.y }}
    />
  );
}

// COMPONENT — BackgroundLayers
// Noise grain, two hairline rules, three drifting orbs
// ─────────────────────────────────────────────────────────────
function BackgroundLayers() {
  return (
    <>
      {/* Film grain */}
      <div className="noise fixed inset-0 z-[2] pointer-events-none opacity-[0.04]" />

      {/* Hairline rules at 28% from top and bottom */}
      <div className="hairline fixed left-0 right-0 h-px pointer-events-none z-[1]" style={{ top: "28%" }} />
      <div className="hairline fixed left-0 right-0 h-px pointer-events-none z-[1]" style={{ bottom: "28%" }} />

      {/* Orb 1 — purple, top-left */}
      <div
        className="orb-purple anim-drift1 fixed rounded-full pointer-events-none z-0 blur-[90px]"
        style={{ width: 500, height: 500, top: "-5%", left: "-5%" }}
      />

      {/* Orb 2 — lavender, bottom-right */}
      <div
        className="orb-white anim-drift2 fixed rounded-full pointer-events-none z-0 blur-[80px]"
        style={{ width: 400, height: 400, bottom: "-5%", right: "-5%" }}
      />

      {/* Orb 3 — blue, bottom-left */}
      <div
        className="orb-blue anim-drift1-rev fixed rounded-full pointer-events-none z-0 blur-[80px]"
        style={{ width: 320, height: 320, bottom: "20%", left: "5%" }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — Wordmark
// 32px icon box with mic SVG + "VoiceRoom" text
// ─────────────────────────────────────────────────────────────
function Wordmark() {
  return (
    <div className="flex items-center gap-[9px] mb-[30px]">
      {/* Icon box */}
      <div
        className="w-8 h-8 rounded-[9px] grid place-items-center"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>

      {/* App name */}
      <span
        className="font-medium tracking-[0.4px]"
        style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.3)" }}
      >
        VoiceRoom
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — JoinForm
// Two inputs + CTA button + footer hint
// ─────────────────────────────────────────────────────────────
interface JoinFormProps {
  username: string;
  roomName: string;
  onUsernameChange: (value: string) => void;
  onRoomNameChange: (value: string) => void;
  onJoin: () => void;
}

function JoinForm({ username, roomName, onUsernameChange, onRoomNameChange, onJoin }: JoinFormProps) {
  const isReady = username.trim() && roomName.trim();

  return (
    <>
      {/* Input: Your name */}
      <div className="mb-[9px]">
        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="ghost-input w-full rounded-[10px] text-sm font-normal transition-[border-color,background,box-shadow] duration-200"
          style={{
            padding: "11.5px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.075)",
            color: "rgba(255,255,255,0.85)",
            fontFamily: "inherit",
            WebkitAppearance: "none",
          }}
        />
      </div>

      {/* Input: Room name */}
      <div className="mb-[9px]">
        <input
          type="text"
          placeholder="Room name"
          value={roomName}
          onChange={(e) => onRoomNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          className="ghost-input w-full rounded-[10px] text-sm font-normal transition-[border-color,background,box-shadow] duration-200"
          style={{
            padding: "11.5px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.075)",
            color: "rgba(255,255,255,0.85)",
            fontFamily: "inherit",
            WebkitAppearance: "none",
          }}
        />
      </div>

      {/* CTA Button */}
      <button
        onClick={onJoin}
        disabled={!isReady}
        className="shimmer-btn relative w-full mt-4 rounded-[10px] text-sm font-medium overflow-hidden transition-all duration-300"
        style={{
          padding: "12.5px",
          fontFamily: "inherit",
          letterSpacing: "0.05px",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          ...(isReady
            ? {
                background: "rgba(255,255,255,0.86)",
                color: "#000",
                boxShadow: "0 2px 24px rgba(255,255,255,0.09)",
                cursor: "pointer",
              }
            : {
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.18)",
                boxShadow: "none",
                cursor: "default",
              }),
        }}
        onMouseEnter={(e) => {
          if (!isReady) return;
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.boxShadow = "0 6px 36px rgba(255,255,255,0.22), 0 0 80px rgba(255,255,255,0.06)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          if (!isReady) return;
          e.currentTarget.style.background = "rgba(255,255,255,0.86)";
          e.currentTarget.style.boxShadow = "0 2px 24px rgba(255,255,255,0.09)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        onMouseDown={(e) => { if (isReady) e.currentTarget.style.transform = "scale(0.99)"; }}
        onMouseUp={(e) => { if (isReady) e.currentTarget.style.transform = "translateY(-1px)"; }}
      >
        {isReady ? "Join Room" : "Enter details"}
      </button>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-[7px] mt-4">
        <div className="w-[3px] h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
        <span className="font-light tracking-[0.2px]" style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)" }}>
          End-to-end encrypted · Press Enter
        </span>
        <div className="w-[3px] h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — GlassCard
// Frosted glass container with surface spotlight + border rim
// ─────────────────────────────────────────────────────────────
interface GlassCardProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  cardMouse: { x: number; y: number };
  mounted: boolean;
  username: string;
  roomName: string;
  onUsernameChange: (value: string) => void;
  onRoomNameChange: (value: string) => void;
  onJoin: () => void;
}
function GlassCard({ cardRef, cardMouse, mounted, username, roomName, onUsernameChange, onRoomNameChange, onJoin }: GlassCardProps) {
  return (
    <div
      ref={cardRef}
      className="relative z-10 overflow-hidden"
      style={{
        width: 355,
        padding: "42px 34px 34px",
        borderRadius: 22,
        background: "rgba(255,255,255,0.028)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.035) inset, 0 50px 100px rgba(0,0,0,0.95), 0 20px 40px rgba(0,0,0,0.6)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(28px) scale(0.96)",
        transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
        "--mx": `${cardMouse.x}px`,
        "--my": `${cardMouse.y}px`,
      } as React.CSSProperties}
    >
      {/* Surface spotlight — lights up the card face where mouse is */}
      <div className="card-light absolute pointer-events-none z-0" style={{ inset: -1, borderRadius: 22 }} />

      {/* Border rim — brightens the 1px border near cursor */}
      <div className="card-rim absolute pointer-events-none z-0" style={{ inset: 0, borderRadius: 22 }} />

      {/* Actual content above both light layers */}
      <div className="relative z-[2]">
        <Wordmark />

        <h1
          className="heading-gradient font-semibold leading-[1.18] mb-[26px]"
          style={{ fontSize: 27, letterSpacing: "-0.9px" }}
        >
          Talk to anyone,<br />instantly.
        </h1>

        <JoinForm
          username={username}
          roomName={roomName}
          onUsernameChange={onUsernameChange}
          onRoomNameChange={onRoomNameChange}
          onJoin={onJoin}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE — Homepage
// ─────────────────────────────────────────────────────────────
export default function Homepage() {
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [mounted, setMounted] = useState(false);

useLayoutEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);
}, []);

  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mouse, cardMouse } = useMousePosition(cardRef);

  const handleJoin = () => {
    const trimmedRoom = roomName.trim();
    const trimmedName = username.trim();
    if (!trimmedRoom || !trimmedName) return;
    sessionStorage.setItem("username", trimmedName);
    router.push(`/room/${trimmedRoom}`);
  };

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* Fixed overlays — outside page div so they span the full viewport */}
      <CustomCursor mouse={mouse} />
      <GlobalSpotlight mouse={mouse} />

      {/* Page — full viewport, dark bg, centered, cursor hidden */}
      <div
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: "#050505", cursor: "none" }}
      >
        <BackgroundLayers />

        <GlassCard
          cardRef={cardRef}
          cardMouse={cardMouse}
          mounted={mounted}
          username={username}
          roomName={roomName}
          onUsernameChange={setUsername}
          onRoomNameChange={setRoomName}
          onJoin={handleJoin}
        />
      </div>
    </>
  );
}