import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';
import { logger, validateEnv } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import type { WSContext } from 'hono/ws';

validateEnv({
  required: [],
  optional: ['PORT', 'OTEL_EXPORTER_OTLP_ENDPOINT'],
});

initTelemetry('chat-service');

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

// Map roomId -> Set of WSContext
const rooms = new Map<string, Set<WSContext>>();
// Map WSContext -> roomId
const clientRooms = new Map<WSContext, string>();

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      logger.info('Client connected to chat');
      ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to Chat Service' }));
    },
    onMessage(event, ws) {
      try {
        const data = JSON.parse(event.data.toString());
        
        if (data.type === 'join') {
          const { roomId } = data;
          if (!roomId) return;
          
          // Leave previous room if any
          const currentRoomId = clientRooms.get(ws);
          if (currentRoomId) {
            const oldRoom = rooms.get(currentRoomId);
            oldRoom?.delete(ws);
            if (oldRoom?.size === 0) rooms.delete(currentRoomId);
          }

          clientRooms.set(ws, roomId);
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)!.add(ws);
          logger.info(`Client joined room ${roomId}`);
          ws.send(JSON.stringify({ type: 'joined', roomId }));
        } else if (data.type === 'message') {
          const { roomId, content, user } = data;
          if (!roomId || !rooms.has(roomId)) return;
          
          const room = rooms.get(roomId)!;
          const message = JSON.stringify({
            type: 'message',
            roomId,
            content,
            user,
            timestamp: new Date().toISOString()
          });
          
          for (const client of room) {
             try {
                 client.send(message);
             } catch (e) {
                 // Handle disconnect
             }
          }
        }
      } catch (err) {
        logger.error('Error processing message', err);
      }
    },
    onClose(event, ws) {
      const roomId = clientRooms.get(ws);
      if (roomId) {
        const room = rooms.get(roomId);
        room?.delete(ws);
        if (room?.size === 0) rooms.delete(roomId);
        clientRooms.delete(ws);
      }
      logger.info('Client disconnected from chat');
    },
  };
}));

app.get('/health', (c) => c.json({ status: 'ok', service: 'chat' }));

const port = parseInt(process.env.PORT || '3007');

export default {
  port,
  fetch: app.fetch,
  websocket,
};
