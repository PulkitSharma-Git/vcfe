"use client";

import { useVoiceRoom } from "@/hooks/useVoiceRoom";

export default function Home() {
  const roomId = "room1";
  const { isMuted, toggleMute, users } = useVoiceRoom(roomId);

  return (
    <div style={{ padding: 40 }}>
      <h1>Voice Room</h1>
      <p>Room: {roomId}</p>

      <button onClick={toggleMute}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <h3>People in Room:</h3>
      <ul>
        {users.map(id => (
        <li key={id}>{id}</li>
      ))}
      </ul>

    </div>
    
  );
}
