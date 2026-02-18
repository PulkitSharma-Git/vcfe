"use client";

import { useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { createPeer, addPeer } from "@/lib/webrtc";

interface PeerConnection {
  peerId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  peer: any;
}

export function useVoiceRoom(roomId: string) {
  const [isMuted, setIsMuted] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const peersRef = useRef<PeerConnection[]>([]);
  const localStream = useRef<MediaStream | null>(null);


  function toggleMute() {
  if (!localStream.current) return;

  const audioTrack = localStream.current.getAudioTracks()[0];
  if (!audioTrack) return;

  const newMutedState = !audioTrack.enabled;
  audioTrack.enabled = newMutedState;

  setIsMuted(!newMutedState);
}


  useEffect(() => {
    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      localStream.current = stream;

      socket.emit("join-room", roomId);

      socket.on("all-users", (users: string[]) => {

        setUsers(users);

        users.forEach(userId => {
          const peer = createPeer(userId, socket.id!, stream);
          peersRef.current.push({ peerId: userId, peer });
        });
      });

      socket.on("user-joined", (userId: string) => {

        setUsers(prev => [...prev, userId]);

        const peer = addPeer(userId, stream);
        peersRef.current.push({ peerId: userId, peer });
      });

      socket.on("receiving-signal", async (payload) => {
        const peerObj = peersRef.current.find(
          p => p.peerId === payload.callerId
        );
        if (!peerObj) return;

        if (payload.signal.type) {
          await peerObj.peer.setRemoteDescription(payload.signal);
          const answer = await peerObj.peer.createAnswer();
          await peerObj.peer.setLocalDescription(answer);

          socket.emit("returning-signal", {
            signal: answer,
            callerId: payload.callerId,
          });
        } else {
          await peerObj.peer.addIceCandidate(payload.signal);
        }
      });

      socket.on("receiving-returned-signal", async (payload) => {
        const peerObj = peersRef.current.find(
          p => p.peerId === payload.id
        );
        if (!peerObj) return;

        await peerObj.peer.setRemoteDescription(payload.signal);
      });

      socket.on("user-left", (id: string) => {
        setUsers(prev => prev.filter(user => user !== id));

        const peerObj = peersRef.current.find(p => p.peerId === id);
        if (peerObj) peerObj.peer.close();
        peersRef.current = peersRef.current.filter(
          p => p.peerId !== id
        );
      });
    }

    start();

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return { isMuted, toggleMute, users };
;
}
