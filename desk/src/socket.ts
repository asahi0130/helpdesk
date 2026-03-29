import { io } from "socket.io-client";

declare global {
  interface Window {
    site_name: string;
    socketio_port?: number | string;
  }
}

export function initSocket() {
  const host = window.location.hostname;
  const siteName = window.site_name || host;

  const configuredPort = window.socketio_port;
  const port =
    configuredPort !== undefined && configuredPort !== null && configuredPort !== ""
      ? `:${configuredPort}`
      : window.location.port
        ? `:${window.location.port}`
        : "";

  const protocol = port ? "http" : "https";
  const url = `${protocol}://${host}${port}/${siteName}`;

  return io(url, {
    withCredentials: true,
    reconnectionAttempts: 5,
  });
}

export const socket = initSocket();
