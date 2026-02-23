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
  const roomManagerRef = useRef<RoomManager | null>(null);
  const speakingCheckInterval = useRef<NodeJS.Timeout | null>(null);

  //Legacy toogleMute
  // bypasses RoomManager and directly manipulates audio track, which causes state sync issues.
  /* 
  function toggleMute() {
    const localStream = roomManagerRef.current?.getLocalStream();
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }
  */

  /*
  New toogleMute flow:
  Audio track toggles
  UserManager updates
  Socket emits mute-state
  UI updates  
  */

  function toggleMute() {
  if (!roomManagerRef.current) return;

  const newMutedState = roomManagerRef.current.toggleMute();
  setIsMuted(newMutedState);
}

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

  useEffect(() => {
    if (!roomId) return;

    const username = sessionStorage.getItem("username");

    if (!username) {
      router.replace("/");
      return;
    }

    // Create room manager
    roomManagerRef.current = new RoomManager(handleUsersUpdate, handleAnalyserCreated);

    // Join the room
    roomManagerRef.current.joinRoom(roomId, username);

    // Start speaking detection
    speakingCheckInterval.current = setInterval(updateSpeakingStatus, 150);

    return () => {
      if (speakingCheckInterval.current) {
        clearInterval(speakingCheckInterval.current);
      }
      roomManagerRef.current?.cleanup();
    };
  }, [roomId, router]);

  return { isMuted, toggleMute, users };
}
