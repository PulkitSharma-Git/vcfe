"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { createPeer, addPeer } from "@/lib/webrtc";

interface User {
  id: string;
  name: string;
  isSelf: boolean;
}

interface PeerConnection {
  peerId: string;
  peer: RTCPeerConnection;
}

export function useVoiceRoom(roomId: string) {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const peersRef = useRef<PeerConnection[]>([]);
  const localStream = useRef<MediaStream | null>(null);

  function toggleMute() {
    if (!localStream.current) return;

    const audioTrack = localStream.current.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }

  useEffect(() => {
    if (!roomId) return;

    const username = sessionStorage.getItem("username");

    if (!username) {
      router.replace("/");
      return;
    }
    if (!username) return;

    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      localStream.current = stream;

      socket.emit("join-room", {
        roomId,
        name: username,
      });

      socket.on(
        "all-users",
        (incomingUsers: { id: string; name: string }[]) => {
          const formatted: User[] = [
            {
              id: socket.id!,
              name: username as string,
              isSelf: true,
            },
            ...incomingUsers.map((user) => ({
              id: user.id,
              name: user.name,
              isSelf: false,
            })),
          ];

          setUsers(formatted);

          incomingUsers.forEach((user) => {
            const peer = createPeer(user.id, socket.id!, stream);
            peersRef.current.push({ peerId: user.id, peer });
          });
        }
      );

      socket.on(
        "user-joined",
        (user: { id: string; name: string }) => {
          setUsers((prev) => [
            ...prev,
            {
              id: user.id,
              name: user.name,
              isSelf: false,
            },
          ]);

          const peer = addPeer(user.id, stream);
          peersRef.current.push({ peerId: user.id, peer });
        }
      );

      socket.on("receiving-signal", async (payload) => {
        const peerObj = peersRef.current.find(
          (p) => p.peerId === payload.callerId
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
          (p) => p.peerId === payload.id
        );
        if (!peerObj) return;

        await peerObj.peer.setRemoteDescription(payload.signal);
      });

      socket.on("user-left", (id: string) => {
        setUsers((prev) => prev.filter((user) => user.id !== id));

        const peerObj = peersRef.current.find((p) => p.peerId === id);
        if (peerObj) peerObj.peer.close();

        peersRef.current = peersRef.current.filter(
          (p) => p.peerId !== id
        );
      });
    }

    start();

    return () => {
      socket.removeAllListeners();
      peersRef.current.forEach((p) => p.peer.close());
      peersRef.current = [];
    };
  }, [roomId]);

  return { isMuted, toggleMute, users };
}
