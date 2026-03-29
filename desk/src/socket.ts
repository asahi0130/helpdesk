import { io } from "socket.io-client";

let socketInstance = null;

declare global {
  interface Window {
    site_name: string;
    socketio_port?: number | string;
  }
}

export function initSocket() {
  if (socketInstance) {
    return socketInstance;
  }

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

  socketInstance = io(url, {
    withCredentials: true,
    reconnectionAttempts: 5,
  });

  return socketInstance;
}
