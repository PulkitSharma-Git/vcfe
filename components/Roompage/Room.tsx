"use client";

import { useParams } from "next/navigation";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";

export default function Room() {
  const params = useParams();
  const roomId = params.roomId as string;

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
        {users.map((user) => (
          <li key={user.id}>
            {user.name}
            {user.isSelf && " (You)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
