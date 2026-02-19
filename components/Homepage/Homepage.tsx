"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Homepage() {
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    const trimmedRoom = roomName.trim();
    const trimmedName = username.trim();

    if (!trimmedRoom || !trimmedName) return;

    // Store username for Room page
    sessionStorage.setItem("username", trimmedName);

    router.push(`/room/${trimmedRoom}`);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Join Voice Room</h1>

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: 8, marginRight: 10 }}
        />
      </div>

      <div>
        <input
          type="text"
          placeholder="Enter room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleJoin();
            }
          }}
          style={{ padding: 8, marginRight: 10 }}
        />

        <button onClick={handleJoin}>
          Join
        </button>
      </div>
    </div>
  );
}
