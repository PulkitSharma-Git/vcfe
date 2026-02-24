"use client";
import { useState } from "react";
import { ConnectionStats, Quality } from "../../hooks/Usewebrtcstats";

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG: Record<Quality, { color: string; label: string }> = {
  good:       { color: "rgba(80,220,120,0.9)",  label: "Excellent" },
  fair:       { color: "rgba(255,190,60,0.9)",  label: "Good"      },
  poor:       { color: "rgba(255,80,80,0.9)",   label: "Bad"       },
  connecting: { color: "rgba(255,255,255,0.2)", label: "..."       },
};

function stabilityLabel(jitter: number | null): string {
  if (jitter === null) return "—";
  if (jitter < 20) return "Stable";
  if (jitter < 50) return "Unstable";
  return "Poor";
}

function rttQuality(rtt: number | null): string {
  if (rtt === null) return "—";
  if (rtt < 80)  return "Great";
  if (rtt < 150) return "Good";
  if (rtt < 300) return "Fair";
  return "Poor";
}

/* ============================================================
   COMPONENT — ConnectionQuality
   Capsule with dot + label. Click to reveal nerdy stats.
   ============================================================ */
interface Props {
  stats: ConnectionStats;
}

export function ConnectionQuality({ stats }: Props) {
  const [open, setOpen] = useState(false);
  const { color, label } = CONFIG[stats.quality];

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {/* ── Expanded stats panel ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10,10,10,0.97)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 190,
            boxShadow: "0 12px 40px rgba(0,0,0,0.9)",
            zIndex: 50,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}` }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "inherit", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Network Stats
            </span>
          </div>

          <Divider />

          <Row label="Ping (RTT)"    value={stats.rtt        !== null ? `${stats.rtt} ms`      : "—"} hint={rttQuality(stats.rtt)} hintColor={color} />
          <Row label="Packet Loss"   value={stats.packetLoss !== null ? `${stats.packetLoss}%` : "—"} />
          <Row label="Jitter"        value={stats.jitter     !== null ? `${stats.jitter} ms`   : "—"} hint={stabilityLabel(stats.jitter)} hintColor={color} />

          <Divider />

          <Row label="Stability"     value={stabilityLabel(stats.jitter)} color={color} />
          <Row label="Overall"       value={label} color={color} />
        </div>
      )}

      {/* ── Capsule button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 999,
          background: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${open ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background 0.2s, border-color 0.2s",
        }}
      >
        {/* Dot */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
            transition: "background 0.4s, box-shadow 0.4s",
          }}
        />
        {/* Label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color,
            fontFamily: "inherit",
            letterSpacing: "0.2px",
            transition: "color 0.4s",
          }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

/* ============================================================
   INTERNALS
   ============================================================ */
function Row({
  label,
  value,
  color,
  hint,
  hintColor,
}: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "inherit", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {hint && (
          <span style={{ fontSize: 9, color: hintColor ?? "rgba(255,255,255,0.2)", fontFamily: "inherit" }}>
            {hint}
          </span>
        )}
        <span
          className="tabular-nums"
          style={{ fontSize: 11, color: color ?? "rgba(255,255,255,0.6)", fontFamily: "inherit", fontWeight: 500 }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />;
}