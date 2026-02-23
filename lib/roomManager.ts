import { socket } from "./socket";
import { createPeer, addPeer, PeerConnection } from "./peerManager";
import { UserManager, User } from "./userManager";
import { AudioAnalyser, createAudioAnalyser } from "./audioAnalysis";

export class RoomManager {
  private userManager: UserManager;
  private localStream: MediaStream | null = null;
  private onUsersUpdate?: (users: User[]) => void;
  private onAnalyserCreated?: (peerId: string, analyser: AudioAnalyser) => void;
  private isMuted: boolean = false;

  constructor(
    onUsersUpdate?: (users: User[]) => void,
    onAnalyserCreated?: (peerId: string, analyser: AudioAnalyser) => void
  ) {
    this.userManager = new UserManager();
    this.onUsersUpdate = onUsersUpdate;
    this.onAnalyserCreated = onAnalyserCreated;
    this.setupSocketListeners();
  }

    toggleMute(): boolean {
      console.log("toggleMute called");
    if (!this.localStream) return this.isMuted;

    const track = this.localStream.getAudioTracks()[0];
    if (!track) return this.isMuted;

    track.enabled = !track.enabled;
    this.isMuted = !track.enabled;

    if (socket.id) {
      this.userManager.updateMuteState(socket.id, this.isMuted);
    }

    this.onUsersUpdate?.(this.userManager.getUsers());

    console.log("Socket connected?", socket.connected);
    console.log("Socket id:", socket.id);

    socket.emit("mute-state-changed", {
      userId: socket.id,
      isMuted: this.isMuted,
    });

    return this.isMuted;
  }

  private setupSocketListeners(): void {
    socket.on(
      "all-users",
      (incomingUsers: { id: string; name: string }[]) => {
        const username = sessionStorage.getItem("username");
        if (!username || !socket.id) return;

        const users = this.userManager.initializeUsers(socket.id, username, incomingUsers);

        // Create peer connections for existing users
        incomingUsers.forEach((user) => {
          if (this.localStream && socket.id) {
            const peer = createPeer(user.id, socket.id, this.localStream, this.onAnalyserCreated);
            this.userManager.addPeer({ peerId: user.id, peer });
          }
        });

        this.onUsersUpdate?.(users);
      }
    );

    socket.on(
      "user-joined",
      (user: { id: string; name: string }) => {
        const users = this.userManager.addUser(user);

        if (this.localStream && socket.id) {
          const peer = addPeer(user.id, socket.id, this.localStream, this.onAnalyserCreated);
          this.userManager.addPeer({ peerId: user.id, peer });
        }

        this.onUsersUpdate?.(users);
      }
    );

    socket.on("receiving-signal", async (payload) => {
      const peerObj = this.userManager.getPeers().find(
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

    socket.on("mute-state-changed", ({ userId, isMuted }) => {
    console.log("Client received mute:", userId, isMuted);

    this.userManager.updateMuteState(userId, isMuted);
    this.onUsersUpdate?.(this.userManager.getUsers());
    });

    socket.on("receiving-returned-signal", async (payload) => {
      const peerObj = this.userManager.getPeers().find(
        (p) => p.peerId === payload.id
      );
      if (!peerObj) return;

      await peerObj.peer.setRemoteDescription(payload.signal);
    });

    socket.on("user-left", (id: string) => {
      const users = this.userManager.removeUser(id);
      this.userManager.removePeer(id);
      this.onUsersUpdate?.(users);
    });
  }

  // NEW
async joinRoom(roomId: string, username: string): Promise<void> {
  this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Attach a local analyser so self tile gets isSpeaking updates
  if (socket.id) {
    const localAnalyser = createAudioAnalyser(this.localStream);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.userManager.addPeer({ peerId: socket.id, peer: null as any });
    this.userManager.attachAnalyserToPeer(socket.id, localAnalyser);
  }

  socket.emit("join-room", { roomId, name: username });
}

  attachAnalyserToPeer(peerId: string, analyser: AudioAnalyser): void {
    this.userManager.attachAnalyserToPeer(peerId, analyser);
  }

  updateSpeakingStatus(): User[] {
    return this.userManager.updateSpeakingStatus();
  }

  getUsers(): User[] {
    return this.userManager.getUsers();
  }

  getPeers(): PeerConnection[] {
    return this.userManager.getPeers();
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  cleanup(): void {
  socket.off("all-users");
  socket.off("user-joined");
  socket.off("receiving-signal");
  socket.off("mute-state-changed");
  socket.off("receiving-returned-signal");
  socket.off("user-left");
  this.userManager.cleanupPeers();
  if (this.localStream) {
    this.localStream.getTracks().forEach(track => track.stop());
  }
}
}