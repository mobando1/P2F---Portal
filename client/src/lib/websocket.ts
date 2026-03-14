import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "./auth";

type WsEventHandler = (data: any) => void;

let globalWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;
const handlers = new Map<string, Set<WsEventHandler>>();

function getWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function connect() {
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    return;
  }

  try {
    globalWs = new WebSocket(getWsUrl());

    globalWs.onopen = () => {
      reconnectAttempts = 0;
      console.log("[WS] Connected");
    };

    globalWs.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, data } = parsed;
        const typeHandlers = handlers.get(type);
        if (typeHandlers) {
          typeHandlers.forEach((handler) => handler(data));
        }
      } catch {
        // ignore malformed messages
      }
    };

    globalWs.onclose = () => {
      globalWs = null;
      scheduleReconnect();
    };

    globalWs.onerror = () => {
      globalWs?.close();
    };
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  if (!isAuthenticated()) return;

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isAuthenticated()) {
      connect();
    }
  }, delay);
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}

function subscribe(type: string, handler: WsEventHandler) {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);
  return () => {
    handlers.get(type)?.delete(handler);
  };
}

/**
 * Initialize WebSocket connection. Call once when user is authenticated.
 */
export function useWebSocketConnection() {
  useEffect(() => {
    if (isAuthenticated()) {
      connect();
    }
    return () => {
      // Don't disconnect on unmount — keep connection alive across page changes
    };
  }, []);
}

/**
 * Subscribe to a specific WebSocket event type.
 */
export function useWsEvent(type: string, handler: WsEventHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler: WsEventHandler = (data) => handlerRef.current(data);
    return subscribe(type, stableHandler);
  }, [type]);
}

/**
 * Auto-invalidate React Query cache on WebSocket events.
 * Maps event types to query keys that should be invalidated.
 */
export function useWsQueryInvalidation() {
  const queryClient = useQueryClient();

  useWsEvent("notification:new", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  });

  useWsEvent("message:new", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/messages/unread"] });
  });

  useWsEvent("class:updated", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tutor/dashboard"] });
  });
}

/**
 * Disconnect WebSocket (call on logout).
 */
export function disconnectWebSocket() {
  disconnect();
}
