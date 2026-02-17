"use client";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);

interface Peer {
  peerId: string;
  peer: RTCPeerConnection;
}

export default function Home() {
  const [roomId] = useState("room1");
  const localStream = useRef<MediaStream | null>(null);
  const peersRef = useRef<Peer[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);

  function createPeer(userToSignal: string, callerId: string, stream: MediaStream): void {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit("sending-signal", {
          userToSignal,
          callerId,
          signal: event.candidate
        });
      }
    };

    peer.createOffer().then((offer: RTCSessionDescriptionInit) => {
      peer.setLocalDescription(offer);
      socket.emit("sending-signal", {
        userToSignal,
        callerId,
        signal: offer
      });
    });

    peersRef.current.push({ peerId: userToSignal, peer });
    setPeers([...peersRef.current]);
  }

  function addPeer(incomingId: string, stream: MediaStream): void {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    socket.on("user-signal", async payload => {
      await peer.setRemoteDescription(new RTCSessionDescription(payload.signal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("returning-signal", {
        signal: answer,
        callerId: payload.callerId
      });
    });

    peer.ontrack = event => {
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.play();
    };

    peersRef.current.push({ peerId: incomingId, peer });
    setPeers([...peersRef.current]);
  }

  function removePeer(userId: string): void {
    const peerObj = peersRef.current.find(p => p.peerId === userId);
    if (peerObj) peerObj.peer.close();

    peersRef.current = peersRef.current.filter(p => p.peerId !== userId);
    setPeers([...peersRef.current]);
  }

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      localStream.current = stream;

      socket.emit("join-room", roomId);

      socket.on("all-users", (users: string[]) => {
        users.forEach((userId: string) => {
          if (socket.id) {
            createPeer(userId, socket.id, stream);
          }
        });
      });

      socket.on("user-joined", (userId: string) => {
        addPeer(userId, stream);
      });

      socket.on("user-left", (userId: string) => {
        removePeer(userId);
      });
    });
  }, [roomId]);

  return (
    <div>
      <h1>Voice Room</h1>
      <p>Room: {roomId}</p>
    </div>
  );
}
