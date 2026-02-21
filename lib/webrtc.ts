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

// Audio analysis for speaking detection
export interface AudioAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  getVolume: () => number;
}

export function createAudioAnalyser(stream: MediaStream): AudioAnalyser {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  source.connect(analyser);
  
  const getVolume = () => {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    return sum / bufferLength;
  };
  
  return { analyser, dataArray, getVolume };
}

export function createPeer(
  userToSignal: string,
  callerId: string,
  stream: MediaStream,
  onAnalyserCreated?: (peerId: string, analyser: AudioAnalyser) => void
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
    
    // Create analyser for speaking detection
    if (onAnalyserCreated) {
      const analyser = createAudioAnalyser(event.streams[0]);
      onAnalyserCreated(userToSignal, analyser);
    }
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
  stream: MediaStream,
  onAnalyserCreated?: (peerId: string, analyser: AudioAnalyser) => void
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
      const c = event.candidate.candidate;
      console.log("[addPeer] Candidate:", c);

      if (c.includes("typ relay")) {
        console.log("🔥 USING TURN");
      } else if (c.includes("typ srflx")) {
        console.log("🌍 USING STUN");
      } else if (c.includes("typ host")) {
        console.log("🏠 USING HOST");
      }
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
    
    // Create analyser for speaking detection
    if (onAnalyserCreated) {
      const analyser = createAudioAnalyser(event.streams[0]);
      onAnalyserCreated(incomingId, analyser);
    }
  };

  return peer;
}
