"use client";
import { useEffect, useRef, useState } from "react";

import io from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
  transports: ["websocket"],
});


export default function Home() {
  const [isMuted, setIsMuted] = useState(false);
  const peersRef = useRef<any[]>([]);
  const localStream = useRef<MediaStream | null>(null);
  const roomId = "room1";

  function toggleMute() {
  if (!localStream.current) return;

  const audioTrack = localStream.current.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;

  setIsMuted(!audioTrack.enabled);
  }

  useEffect(() => {
    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      socket.emit("join-room", roomId);

      socket.on("all-users", (users: string[]) => {
        users.forEach(userId => {
          const peer = createPeer(userId, socket.id!, stream);
          peersRef.current.push({ peerId: userId, peer });
        });
      });

      socket.on("user-joined", (userId: string) => {
        const peer = addPeer(userId, stream);
        peersRef.current.push({ peerId: userId, peer });
      });

      socket.on("receiving-signal", async (payload) => {
        const peerObj = peersRef.current.find(p => p.peerId === payload.callerId);
        if (!peerObj) return;

        if (payload.signal.type) {
          await peerObj.peer.setRemoteDescription(payload.signal);
          const answer = await peerObj.peer.createAnswer();
          await peerObj.peer.setLocalDescription(answer);

          socket.emit("returning-signal", {
            signal: answer,
            callerId: payload.callerId
          });
        } else {
          await peerObj.peer.addIceCandidate(payload.signal);
        }
      });

      socket.on("receiving-returned-signal", async (payload) => {
        const peerObj = peersRef.current.find(p => p.peerId === payload.id);
        if (!peerObj) return;

        await peerObj.peer.setRemoteDescription(payload.signal);
      });

      socket.on("user-left", (id: string) => {
        const peerObj = peersRef.current.find(p => p.peerId === id);
        if (peerObj) peerObj.peer.close();
        peersRef.current = peersRef.current.filter(p => p.peerId !== id);
      });
    }

    start();
  }, []);

  function createPeer(userToSignal: string, callerId: string, stream: MediaStream) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("sending-signal", {
          userToSignal,
          callerId,
          signal: event.candidate
        });
      }
    };

    peer.ontrack = event => {
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.play().catch(() => {});
    };

    peer.createOffer().then(offer => {
      peer.setLocalDescription(offer);
      socket.emit("sending-signal", {
        userToSignal,
        callerId,
        signal: offer
      });
    });

    return peer;
  }

  function addPeer(incomingId: string, stream: MediaStream) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("sending-signal", {
          userToSignal: incomingId,
          callerId: socket.id,
          signal: event.candidate
        });
      }
    };

    peer.ontrack = event => {
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.play().catch(() => {});
    };

    return peer;
  }

  return (
  <div style={{ padding: 40 }}>
    <h1>Voice Room</h1>
    <p>Room: {roomId} </p>

    <button onClick={toggleMute}>
      {isMuted ? "Unmute" : "Mute"}
    </button>
  </div>
  );

}
