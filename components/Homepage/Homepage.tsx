"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Homepage() {
  const [roomName, setRoomName] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    const trimmed = roomName.trim();
    if (!trimmed) return;

    router.push(`/room/${trimmed}`);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Join Voice Room</h1>

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
  );
}
