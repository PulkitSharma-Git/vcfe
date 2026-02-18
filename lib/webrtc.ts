import { socket } from "./socket";

export function createPeer(
  userToSignal: string,
  callerId: string,
  stream: MediaStream
) {
  const peer = new RTCPeerConnection({
  iceServers: [
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
  ],
});


  stream.getTracks().forEach(track => peer.addTrack(track, stream));

  peer.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("sending-signal", {
        userToSignal,
        callerId,
        signal: event.candidate,
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
      signal: offer,
    });
  });

  return peer;
}

export function addPeer(
  incomingId: string,
  stream: MediaStream
) {
  const peer = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD",
    },
  ],
});


  stream.getTracks().forEach(track => peer.addTrack(track, stream));

  peer.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("sending-signal", {
        userToSignal: incomingId,
        callerId: socket.id,
        signal: event.candidate,
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
