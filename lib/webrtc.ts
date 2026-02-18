import { socket } from "./socket";

// 🔥 ADDED
function debugPeer(peer: RTCPeerConnection, label: string) {
  peer.oniceconnectionstatechange = () => {
    console.log(`[${label}] ICE State:`, peer.iceConnectionState);
  };

  peer.onconnectionstatechange = () => {
    console.log(`[${label}] Connection State:`, peer.connectionState);
  };
}

export function createPeer(
  userToSignal: string,
  callerId: string,
  stream: MediaStream
) {
  const peer = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
  ],
});

  debugPeer(peer, "createPeer");


  stream.getTracks().forEach(track => peer.addTrack(track, stream));

  peer.onicecandidate = event => {

    if (event.candidate) {

      // 🔥 ADDED (log candidate type)
      const c = event.candidate.candidate;
      console.log("[createPeer] Candidate:", c);

      if (c.includes("typ relay")) {
        console.log("🔥 USING TURN");
      } else if (c.includes("typ srflx")) {
       console.log("🌍 USING STUN");
      } else if (c.includes("typ host")) {
        console.log("🏠 USING HOST");
      }
    // 🔥 END
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
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "136734e748bd7c3e555b5876",
      credential: "Jne/JB3/sdGmQJwN",
    },
  ],
});

  debugPeer(peer, "addPeer");


  stream.getTracks().forEach(track => peer.addTrack(track, stream));

  peer.onicecandidate = event => {
    if (event.candidate) {

      // 🔥 ADDED
    const c = event.candidate.candidate;
    console.log("[addPeer] Candidate:", c);

    if (c.includes("typ relay")) {
      console.log("🔥 USING TURN");
    } else if (c.includes("typ srflx")) {
      console.log("🌍 USING STUN");
    } else if (c.includes("typ host")) {
      console.log("🏠 USING HOST");
    }
    // 🔥 END
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
