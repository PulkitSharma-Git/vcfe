"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const ROOM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');

  body { background: #000; overflow: hidden; font-family: 'Outfit', -apple-system, sans-serif; }

  .spotlight {
    background: radial-gradient(circle at center, rgba(255,255,255,0.065) 0%, rgba(180,140,255,0.03) 30%, transparent 65%);
    transition: left 0.07s ease-out, top 0.07s ease-out;
  }

  .noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
  }

  .custom-cursor { mix-blend-mode: difference; }

  @keyframes live-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(80,220,120,0.5); }
    50%     { box-shadow: 0 0 0 4px rgba(80,220,120,0); }
  }
  .live-dot { animation: live-pulse 2s ease-in-out infinite; }

  @keyframes speak-ring {
    0%   { transform: scale(1);    opacity: 0.7; }
    100% { transform: scale(1.55); opacity: 0;   }
  }
  .ring1 { animation: speak-ring 1.4s ease-out infinite; }
  .ring2 { animation: speak-ring 1.4s 0.35s ease-out infinite; }

  .tile-light {
    background: radial-gradient(circle at var(--tx,50%) var(--ty,0%), rgba(255,255,255,0.05), transparent 65%);
  }
  .tile-rim {
    padding: 1px;
    background: radial-gradient(130px circle at var(--tx,50%) var(--ty,0%), rgba(255,255,255,0.13), transparent 70%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .ctrl-mic-on  { background: rgba(255,255,255,0.88) !important; box-shadow: 0 2px 20px rgba(255,255,255,0.12) !important; }
  .ctrl-mic-on  svg { stroke: #000 !important; }
  .ctrl-mic-off { background: rgba(255,60,60,0.12) !important; border-color: rgba(255,60,60,0.25) !important; }
  .ctrl-mic-off svg { stroke: rgba(255,100,100,0.9) !important; }
  .ctrl-feat-on { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.16) !important; }

  .has-tip { position: relative; }
  .has-tip::after {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
    padding: 4px 8px;
    background: rgba(12,12,12,0.96); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px; font-size: 10px; font-family: 'Outfit', sans-serif;
    color: rgba(255,255,255,0.45); white-space: nowrap;
    opacity: 0; pointer-events: none; transition: opacity 0.15s;
  }
  .has-tip:hover::after { opacity: 1; }
`;

// ─────────────────────────────────────────────────────────────
// HOOK — useMousePositionGlobal
// ─────────────────────────────────────────────────────────────
function useMousePositionGlobal() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const fn = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);
  return mouse;
}

// ─────────────────────────────────────────────────────────────
// HOOK — useTimer
// ─────────────────────────────────────────────────────────────
function useTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// HOOK — useIsMobile
// ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────
const MicOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const PTTIcon = ({ active, enabled }: { active: boolean; enabled: boolean }) => (
  <svg
    width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke={active ? "rgba(80,220,120,0.9)" : enabled ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
  >
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <path d="M12 6v4" />
    <path d="M5 10h14" />
    <path d="M8 10v6a4 4 0 0 0 8 0v-6" />
  </svg>
);



// ─────────────────────────────────────────────────────────────
// COMPONENT — CustomCursor
// ─────────────────────────────────────────────────────────────
function CustomCursor({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <div
      className="custom-cursor fixed w-2 h-2 rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
      style={{ left: mouse.x, top: mouse.y, background: "rgba(255,255,255,0.9)" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — GlobalSpotlight
// ─────────────────────────────────────────────────────────────
function GlobalSpotlight({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <div
      className="spotlight fixed pointer-events-none z-[1] rounded-full -translate-x-1/2 -translate-y-1/2 blur-[1px]"
      style={{ left: mouse.x, top: mouse.y, width: 700, height: 700 }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — BackgroundLayers
// ─────────────────────────────────────────────────────────────
function BackgroundLayers() {
  return <div className="noise fixed inset-0 z-[2] pointer-events-none opacity-[0.04]" />;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — TopBar
// ─────────────────────────────────────────────────────────────
function TopBar({ roomId, mounted, onLeave }: { roomId: string; mounted: boolean; onLeave: () => void }) {
  const elapsed = useTimer();
  return (
    <div
      className="relative z-10 flex items-center justify-between px-7 py-5 shrink-0"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-[10px]">
        <div
          className="w-[30px] h-[30px] rounded-[8px] grid place-items-center shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <span className="text-xs font-medium tracking-[0.4px]" style={{ color: "rgba(255,255,255,0.28)" }}>
          VoiceRoom
        </span>
      </div>

      {/* Live room pill */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-[6px] px-3 py-[5px] rounded-full"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="live-dot w-[6px] h-[6px] rounded-full shrink-0"
          style={{ background: "rgba(80,220,120,0.9)", boxShadow: "0 0 8px rgba(80,220,120,0.6)" }}
        />
        <span className="text-xs font-medium tracking-[0.3px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          {roomId}
        </span>
      </div>

      {/* Timer + Leave */}
      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums tracking-[0.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {elapsed}
        </span>
        <button
          onClick={onLeave}
          className="px-[14px] py-[6px] rounded-[8px] text-xs font-medium transition-all duration-200"
          style={{
            background: "rgba(255,60,60,0.08)",
            border: "1px solid rgba(255,60,60,0.18)",
            color: "rgba(255,100,100,0.8)",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,60,60,0.15)"; e.currentTarget.style.color = "rgba(255,130,130,1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,60,60,0.08)"; e.currentTarget.style.color = "rgba(255,100,100,0.8)"; }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — UserTile
// Badges:
//   mute  → bottom-LEFT  (SVG mic-off icon, red tint)
//   "you" → bottom-RIGHT (text pill)
// They can both appear at the same time without overlapping.
// ─────────────────────────────────────────────────────────────
function UserTile({ user }: { user: { id: string; name: string; isSelf: boolean; isSpeaking?: boolean; isMuted?: boolean } }) {
  const tileRef = useRef<HTMLDivElement>(null);
  const [tileMouse, setTileMouse] = useState({ x: 0, y: 0 });
  const initial = user.name.charAt(0).toUpperCase();

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = tileRef.current?.getBoundingClientRect();
    if (rect) setTileMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={tileRef}
      onMouseMove={handleMouseMove}
      className="relative flex flex-col items-center gap-[10px] overflow-hidden"
      style={{
        width: 110,
        padding: "20px 12px 16px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.028)",
        border: user.isSpeaking && !user.isMuted
          ? "1px solid rgba(80,220,120,0.4)"   // speaking always wins
          : user.isSelf
          ? "1px solid rgba(255,255,255,0.12)" // self at rest
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: user.isSpeaking && !user.isMuted
          ? "0 0 0 1px rgba(80,220,120,0.08) inset, 0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(80,220,120,0.07)"
          : "0 0 0 1px rgba(255,255,255,0.03) inset, 0 8px 32px rgba(0,0,0,0.6)",
        transition: "border-color 0.3s, box-shadow 0.3s",
        // @ts-expect-error — CSS custom properties
        "--tx": `${tileMouse.x}px`,
        "--ty": `${tileMouse.y}px`,
      }}
    >
      <div className="tile-light absolute inset-0 pointer-events-none z-0 rounded-[18px]" />
      <div className="tile-rim absolute inset-0 pointer-events-none z-0 rounded-[18px]" />

      <div className="relative z-[1]">
        {user.isSpeaking && !user.isMuted && (
          <>
            <div className="ring1 absolute inset-[-6px] rounded-full pointer-events-none" style={{ border: "1.5px solid rgba(80,220,120,0.45)" }} />
            <div className="ring2 absolute inset-[-12px] rounded-full pointer-events-none" style={{ border: "1px solid rgba(80,220,120,0.2)" }} />
          </>
        )}

        {/* Avatar circle — desaturated + dimmed when muted */}
        <div
          className="w-[52px] h-[52px] rounded-full grid place-items-center text-[19px] font-semibold select-none relative z-[1]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: user.isSpeaking ? "1px solid rgba(80,220,120,0.5)" : "1px solid rgba(255,255,255,0.1)",
            color: user.isMuted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)",
            filter: user.isMuted ? "grayscale(1) brightness(0.45)" : "none",
            transition: "border-color 0.3s, filter 0.3s, color 0.3s",
          }}
        >
          {initial}
        </div>

        {/* "you" badge — bottom-RIGHT */}
        {user.isSelf && (
          <div
            className="absolute -bottom-[3px] -right-[3px] px-[5px] py-[2px] rounded-[6px] text-[8px] font-medium z-[2] whitespace-nowrap"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            you
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className="relative z-[1] text-[11.5px] font-medium text-center tracking-[0.1px] max-w-[90px] truncate"
        style={{ color: user.isSelf ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)" }}
      >
        {user.name}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — UsersGrid
// ─────────────────────────────────────────────────────────────
function UsersGrid({ users, mounted }: { users: any[]; mounted: boolean }) {
  return (
    <div
      className="flex flex-wrap gap-[14px] justify-center max-w-[600px]"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s 0.1s cubic-bezier(0.16,1,0.3,1), transform 0.7s 0.1s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {users.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Room is empty</p>
          <p className="text-xs font-light tracking-[0.2px]" style={{ color: "rgba(255,255,255,0.15)" }}>
            Share the link below to invite others
          </p>
        </div>
      ) : (
        users.map((user) => <UserTile key={user.id} user={user} />)
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT — ControlsBar
// ─────────────────────────────────────────────────────────────
function ControlsBar({
  isMuted,
  onToggleMute,
  participantCount,
  mounted,
  pushToTalkMode,
  isPTTActive,
  onTogglePTT,
}: {
  isMuted: boolean;
  onToggleMute: () => void;
  participantCount: number;
  mounted: boolean;
  pushToTalkMode: boolean;
  isPTTActive: boolean;
  onTogglePTT: () => void;
}) {
  const isMobile = useIsMobile();

  const baseStyle = {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid" as const,
    placeItems: "center",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
    fontFamily: "inherit",
  };

  const hoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
    e.currentTarget.style.transform = "translateY(-1px)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>, active = false) => {
    e.currentTarget.style.background = active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
    e.currentTarget.style.transform = "translateY(0)";
  };

  return (
    <div
      className="flex items-center gap-[10px] px-5 py-[14px] rounded-[22px]"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 20px 40px rgba(0,0,0,0.7)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(14px)",
        transition: "opacity 0.7s 0.2s cubic-bezier(0.16,1,0.3,1), transform 0.7s 0.2s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* ── Mute / Unmute ── */}
      <button
        className={`has-tip ${isMuted ? "ctrl-mic-off" : "ctrl-mic-on"}`}
        style={baseStyle}
        onClick={(e) => { onToggleMute(); e.currentTarget.blur(); }}
        onKeyDown={(e) => { if (e.code === "Space" || e.code === "Enter") e.preventDefault(); }}
        data-tip={isMuted ? "Unmute" : "Mute"}
        onMouseEnter={(e) => {
          if (!isMuted) {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.boxShadow = "0 4px 28px rgba(255,255,255,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isMuted) {
            e.currentTarget.style.background = "rgba(255,255,255,0.88)";
            e.currentTarget.style.boxShadow = "0 2px 20px rgba(255,255,255,0.12)";
          }
        }}
      >
        {isMuted ? <MicOffIcon /> : <MicOnIcon />}
      </button>

      {/* ── PTT section — desktop only ── */}
      {!isMobile && (
        <>
          <div className="w-px h-7 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

          <button
            className={`has-tip ${pushToTalkMode ? "ctrl-feat-on" : ""}`}
            style={{
              ...baseStyle,
              ...(isPTTActive
                ? {
                    background: "rgba(80,220,120,0.15)",
                    border: "1px solid rgba(80,220,120,0.35)",
                    boxShadow: "0 0 16px rgba(80,220,120,0.1)",
                  }
                : {}),
            }}
            onClick={(e) => { onTogglePTT(); e.currentTarget.blur(); }}
            onKeyDown={(e) => { if (e.code === "Space" || e.code === "Enter") e.preventDefault(); }}
            data-tip={pushToTalkMode ? "PTT: ON (Space)" : "Push to Talk"}
            onMouseEnter={(e) => hoverIn(e)}
            onMouseLeave={(e) => hoverOut(e, pushToTalkMode)}
          >
            <PTTIcon active={isPTTActive} enabled={pushToTalkMode} />
          </button>

          {pushToTalkMode && (
            <div
              className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[9px]"
              style={{
                background: isPTTActive ? "rgba(80,220,120,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isPTTActive ? "rgba(80,220,120,0.3)" : "rgba(255,255,255,0.07)"}`,
                transition: "all 0.2s",
              }}
            >
              <div
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{
                  background: isPTTActive ? "rgba(80,220,120,0.9)" : "rgba(255,255,255,0.2)",
                  boxShadow: isPTTActive ? "0 0 6px rgba(80,220,120,0.6)" : "none",
                  transition: "all 0.15s",
                }}
              />
              <span style={{ fontSize: "10px", color: isPTTActive ? "rgba(80,220,120,0.8)" : "rgba(255,255,255,0.25)", fontFamily: "inherit" }}>
                {isPTTActive ? "Transmitting" : "Hold Space"}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE — Room
// ─────────────────────────────────────────────────────────────
export default function Room() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [mounted, setMounted] = useState(false);
  const mouse = useMousePositionGlobal();

  const { isMuted, toggleMute, users, pushToTalkMode, isPTTActive, togglePushToTalkMode } = useVoiceRoom(roomId);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <style>{ROOM_STYLES}</style>

      <CustomCursor mouse={mouse} />
      <GlobalSpotlight mouse={mouse} />

      <div
        className="relative flex flex-col min-h-screen overflow-hidden"
        style={{ background: "#050505", cursor: "none" }}
      >
        <BackgroundLayers />

        <TopBar roomId={roomId} mounted={mounted} onLeave={() => router.push("/")} />

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-5 py-8">
          <UsersGrid users={users} mounted={mounted} />
          <ControlsBar
            isMuted={isMuted}
            onToggleMute={toggleMute}
            participantCount={users.length}
            mounted={mounted}
            pushToTalkMode={pushToTalkMode}
            isPTTActive={isPTTActive}
            onTogglePTT={togglePushToTalkMode}
          />
        </main>
      </div>
    </>
  );
}