"use client";
import { useEffect, useRef, useState } from "react";
import { PeerConnection } from "@/lib/peerManager";

export type Quality = "good" | "fair" | "poor" | "connecting";

export interface ConnectionStats {
  quality: Quality;
  rtt: number | null;       // ms
  packetLoss: number | null; // %
  jitter: number | null;    // ms
}

const POLL_INTERVAL = 2500;

function classify(rtt: number | null, loss: number | null, jitter: number | null): Quality {
  if (rtt === null && loss === null) return "connecting";
  const r = rtt ?? 0;
  const l = loss ?? 0;
  const j = jitter ?? 0;
  if (r < 150 && l < 1 && j < 20) return "good";
  if (r < 300 && l < 5 && j < 50) return "fair";
  return "poor";
}

export function useWebRTCStats(getPeers: () => PeerConnection[]): ConnectionStats {
  const [stats, setStats] = useState<ConnectionStats>({
    quality: "connecting",
    rtt: null,
    packetLoss: null,
    jitter: null,
  });

  const prevRef = useRef<{ packetsReceived: number; packetsLost: number } | null>(null);

  useEffect(() => {
    const poll = async () => {
      const peers = getPeers().filter(p => p.peer && p.peer.connectionState === "connected");
      if (peers.length === 0) return;

      // Aggregate stats across all peers
      // eslint-disable-next-line prefer-const
      let totalRtt: number[] = [];
      // eslint-disable-next-line prefer-const
      let totalLoss: number[] = [];
      // eslint-disable-next-line prefer-const
      let totalJitter: number[] = [];

      for (const { peer } of peers) {
        try {
          const reports = await peer.getStats();
          reports.forEach(report => {
            if (report.type === "candidate-pair" && report.state === "succeeded" && report.currentRoundTripTime) {
              totalRtt.push(report.currentRoundTripTime * 1000);
            }
            if (report.type === "inbound-rtp" && report.kind === "audio") {
              const total = (report.packetsReceived ?? 0) + (report.packetsLost ?? 0);
              if (total > 0) {
                totalLoss.push(((report.packetsLost ?? 0) / total) * 100);
              }
              if (report.jitter != null) {
                totalJitter.push(report.jitter * 1000);
              }
            }
          });
        } catch {
          // peer may have closed mid-poll
        }
      }

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const rtt = avg(totalRtt);
      const packetLoss = avg(totalLoss);
      const jitter = avg(totalJitter);

      setStats({
        quality: classify(rtt, packetLoss, jitter),
        rtt: rtt !== null ? Math.round(rtt) : null,
        packetLoss: packetLoss !== null ? parseFloat(packetLoss.toFixed(1)) : null,
        jitter: jitter !== null ? Math.round(jitter) : null,
      });
    };

    const id = setInterval(poll, POLL_INTERVAL);
    poll(); // immediate first run
    return () => clearInterval(id);
  }, [getPeers]);

  return stats;
}