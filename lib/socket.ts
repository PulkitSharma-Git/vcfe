"use client";
import { io, Socket } from "socket.io-client";

let socket: Socket;

if (typeof window !== "undefined") {
  socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
    transports: ["websocket"],
  });
}

export { socket };