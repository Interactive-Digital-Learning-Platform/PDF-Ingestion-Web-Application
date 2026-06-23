import type { WsProgressEvent } from "@/lib/api/types";

type ConnectOptions = {
  jobId: string;
  onEvent: (event: WsProgressEvent) => void;
  onError?: (message: string) => void;
};

function getWebSocketBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_BASE_URL) {
    return process.env.NEXT_PUBLIC_WS_BASE_URL;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  return apiUrl.replace(/^http/, "ws");
}

export function connectJobProgress({ jobId, onEvent, onError }: ConnectOptions): () => void {
  const base = getWebSocketBaseUrl().replace(/\/$/, "");
  const socket = new WebSocket(`${base}/ingest/ws/${jobId}`);

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as WsProgressEvent;
      onEvent(parsed);
      if (parsed.status === "done" || parsed.status === "failed") {
        socket.close();
      }
    } catch {
      onError?.("Received invalid websocket payload");
    }
  };

  socket.onerror = () => {
    onError?.("Realtime connection failed, polling fallback is active.");
  };

  return () => {
    socket.close();
  };
}
