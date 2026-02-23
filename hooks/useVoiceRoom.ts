"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RoomManager } from "@/lib/roomManager";
import { User } from "@/lib/userManager";
import { AudioAnalyser } from "@/lib/audioAnalysis";

export function useVoiceRoom(roomId: string) {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pushToTalkMode, setPushToTalkMode] = useState(false);
  const [isPTTActive, setIsPTTActive] = useState(false);

  const roomManagerRef = useRef<RoomManager | null>(null);
  const speakingCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // ── Refs so keyboard handlers never go stale ──────────────
  // Never put these in useEffect deps — read them directly instead
  const pttModeRef = useRef(false);
  const isPTTActiveRef = useRef(false);
  const isMutedRef = useRef(false);

  // Keeps both the ref and state in sync in one call
  const setIsMutedSync = (val: boolean) => {
    isMutedRef.current = val;
    setIsMuted(val);
  };

  // ── Standard mute toggle ──────────────────────────────────
  function toggleMute() {
    if (!roomManagerRef.current) return;
    const newMutedState = roomManagerRef.current.toggleMute();
    setIsMutedSync(newMutedState);
  }

  // ── Push-to-talk mode on/off ──────────────────────────────
  function togglePushToTalkMode() {
    const entering = !pttModeRef.current;
    pttModeRef.current = entering;
    setPushToTalkMode(entering);

    if (entering) {
      // Auto-mute mic on entering PTT mode
      if (roomManagerRef.current && !isMutedRef.current) {
        roomManagerRef.current.toggleMute();
        setIsMutedSync(true);
      }
    } else {
      // Leaving PTT — ensure mic is unmuted and state is clean
      isPTTActiveRef.current = false;
      setIsPTTActive(false);
      if (roomManagerRef.current) {
        const stream = roomManagerRef.current.getLocalStream();
        const track = stream?.getAudioTracks()[0];
        if (track && !track.enabled) {
          roomManagerRef.current.toggleMute();
          setIsMutedSync(false);
        }
      }
    }
  }

  // ── Internal helpers ──────────────────────────────────────
  function updateSpeakingStatus() {
    if (roomManagerRef.current) {
      const updatedUsers = roomManagerRef.current.updateSpeakingStatus();
      setUsers(updatedUsers);
    }
  }

  function handleAnalyserCreated(peerId: string, analyser: AudioAnalyser) {
    roomManagerRef.current?.attachAnalyserToPeer(peerId, analyser);
  }

  function handleUsersUpdate(updatedUsers: User[]) {
    setUsers(updatedUsers);
  }

  // ── Room setup & teardown ─────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const username = sessionStorage.getItem("username");
    if (!username) {
      router.replace("/");
      return;
    }

    roomManagerRef.current = new RoomManager(handleUsersUpdate, handleAnalyserCreated);
    roomManagerRef.current.joinRoom(roomId, username);
    speakingCheckInterval.current = setInterval(updateSpeakingStatus, 150);

    return () => {
      if (speakingCheckInterval.current) clearInterval(speakingCheckInterval.current);
      roomManagerRef.current?.cleanup();
    };
  }, [roomId, router]);

  // ── Spacebar PTT ──────────────────────────────────────────
  // Registered ONCE with empty deps.
  // All state is read via refs so no stale closure issues.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      e.preventDefault();

      // Bail if PTT mode is off or room isn't ready
      if (!pttModeRef.current || !roomManagerRef.current) return;
      // Bail if already transmitting (prevents double-trigger)
      if (isPTTActiveRef.current) return;

      const stream = roomManagerRef.current.getLocalStream();
      const track = stream?.getAudioTracks()[0];
      if (track && !track.enabled) {
        roomManagerRef.current.toggleMute();
        setIsMutedSync(false);
      }
      isPTTActiveRef.current = true;
      setIsPTTActive(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;

      if (!pttModeRef.current || !roomManagerRef.current) return;
      // Bail if we weren't actually transmitting
      if (!isPTTActiveRef.current) return;

      const stream = roomManagerRef.current.getLocalStream();
      const track = stream?.getAudioTracks()[0];
      if (track && track.enabled) {
        roomManagerRef.current.toggleMute();
        setIsMutedSync(true);
      }
      isPTTActiveRef.current = false;
      setIsPTTActive(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []); // ← intentionally empty: refs carry all the state

  return {
    isMuted,
    toggleMute,
    users,
    pushToTalkMode,
    isPTTActive,
    togglePushToTalkMode,
  };
}