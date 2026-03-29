import { io } from "socket.io-client";

// extend window object
declare global {
  interface Window {
    site_name: string;
    socketio_port?: string | number;
  }
}

export function initSocket() {
  let host = window.location.hostname;
  let siteName = window.site_name || host;
  const configuredPort =
    window.socketio_port || import.meta.env.VITE_SOCKETIO_PORT || "9000";
  let port = window.location.port ? `:${configuredPort}` : "";
  let protocol = port ? "http" : "https";
  let url = `${protocol}://${host}${port}/${siteName}`;

  const socket = io(url, {
    withCredentials: true,
    reconnectionAttempts: 5,
  });

  return socket;
}

export const socket = initSocket();
