import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";

export interface WsEvent {
  type: string;
  data: any;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connections = new Map<number, Set<WebSocket>>();

  initialize(server: Server, sessionParser: any) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request: IncomingMessage, socket, head) => {
      // Only handle /ws path
      if (request.url !== "/ws") return;

      // Parse session to authenticate
      sessionParser(request, {} as any, () => {
        const userId = (request as any).session?.userId;
        if (!userId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit("connection", ws, request, userId);
        });
      });
    });

    this.wss.on("connection", (ws: WebSocket, _request: IncomingMessage, userId: number) => {
      // Register connection
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId)!.add(ws);

      // Send welcome
      ws.send(JSON.stringify({ type: "connected", data: { userId } }));

      // Heartbeat
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on("close", () => {
        clearInterval(pingInterval);
        const userConns = this.connections.get(userId);
        if (userConns) {
          userConns.delete(ws);
          if (userConns.size === 0) {
            this.connections.delete(userId);
          }
        }
      });

      ws.on("error", () => {
        clearInterval(pingInterval);
      });
    });

    console.log("[WebSocket] Server initialized");
  }

  /**
   * Send event to a specific user (all their connections/tabs)
   */
  sendToUser(userId: number, event: WsEvent): void {
    const userConns = this.connections.get(userId);
    if (!userConns) return;

    const payload = JSON.stringify(event);
    userConns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Send event to multiple users
   */
  sendToUsers(userIds: number[], event: WsEvent): void {
    for (const userId of userIds) {
      this.sendToUser(userId, event);
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event: WsEvent): void {
    if (!this.wss) return;
    const payload = JSON.stringify(event);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  getConnectedUserCount(): number {
    return this.connections.size;
  }
}

export const wsService = new WebSocketService();
