import { AudioAnalyser, isUserSpeaking } from "./audioAnalysis";

export interface User {
  id: string;
  name: string;
  isSelf: boolean;
  isSpeaking?: boolean;
}

export interface PeerConnection {
  peerId: string;
  peer: RTCPeerConnection;
  analyser?: AudioAnalyser;
}

export class UserManager {
  private users: User[] = [];
  private peers: PeerConnection[] = [];

  constructor() {}

  // Initialize users when joining room
  initializeUsers(currentUserId: string, currentUserName: string, incomingUsers: { id: string; name: string }[]): User[] {
    this.users = [
      {
        id: currentUserId,
        name: currentUserName,
        isSelf: true,
      },
      ...incomingUsers.map((user) => ({
        id: user.id,
        name: user.name,
        isSelf: false,
      })),
    ];
    return this.users;
  }

  // Add a new user
  addUser(user: { id: string; name: string }): User[] {
    const newUser: User = {
      id: user.id,
      name: user.name,
      isSelf: false,
    };
    this.users = [...this.users, newUser];
    return this.users;
  }

  // Remove a user
  removeUser(userId: string): User[] {
    this.users = this.users.filter((user) => user.id !== userId);
    return this.users;
  }

  // Update speaking status for all users
  updateSpeakingStatus(): User[] {
    this.users = this.users.map(user => {
      if (user.isSelf) return user; // Don't check self for speaking

      const peerObj = this.peers.find(p => p.peerId === user.id);
      if (!peerObj?.analyser) return { ...user, isSpeaking: false };

      const isSpeaking = isUserSpeaking(peerObj.analyser);
      return { ...user, isSpeaking };
    });

    return this.users;
  }

  // Add a peer connection
  addPeer(peerConnection: PeerConnection): void {
    this.peers.push(peerConnection);
  }

  // Remove a peer connection
  removePeer(peerId: string): void {
    this.peers = this.peers.filter(p => p.peerId !== peerId);
  }

  // Attach analyser to peer
  attachAnalyserToPeer(peerId: string, analyser: AudioAnalyser): void {
    const peerObj = this.peers.find(p => p.peerId === peerId);
    if (peerObj) {
      peerObj.analyser = analyser;
    }
  }

  // Get current users
  getUsers(): User[] {
    return this.users;
  }

  // Get current peers
  getPeers(): PeerConnection[] {
    return this.peers;
  }

  // Clean up all peers
  cleanupPeers(): void {
    this.peers.forEach(p => p.peer.close());
    this.peers = [];
  }
}