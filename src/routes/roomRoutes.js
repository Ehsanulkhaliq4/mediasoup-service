import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getMediasoupWorker } from "../mediasoup/worker.js";

export function createRoomRoutes(roomManager, workerPool) {
  const router = express.Router();

  // POST /api/rooms - Create a new room
  router.post("/", async (req, res) => {
    try {
      let { roomId, title } = req.body;

      if (!roomId) {
        // Generate a clean Zoom/Meet style meeting code: e.g. "meet-8f3a-2b1c"
        const shortCode = Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 6);
        roomId = `conf-${shortCode}`;
      }

      const worker = workerPool?.getNextWorker?.() || getMediasoupWorker();
      const room = await roomManager.createRoom(worker, roomId, { title });

      return res.status(201).json({
        success: true,
        message: "Room created successfully",
        roomId: room.id,
        title: room.title,
        createdAt: room.createdAt,
        routerId: room.router.id,
        routerRtpCapabilities: room.router.rtpCapabilities,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/rooms - List all active rooms
  router.get("/", (req, res) => {
    try {
      const rooms = roomManager.getAllRooms();
      return res.json({
        success: true,
        totalRooms: rooms.length,
        rooms,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/rooms/:roomId - Get room details and RTP capabilities
  router.get("/:roomId", (req, res) => {
    try {
      const { roomId } = req.params;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: "Room not found",
        });
      }

      const summary = roomManager.getRoomSummary(roomId);

      return res.json({
        success: true,
        room: {
          ...summary,
          routerRtpCapabilities: room.router.rtpCapabilities,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/rooms/:roomId - Close room
  router.delete("/:roomId", (req, res) => {
    try {
      const { roomId } = req.params;
      const deleted = roomManager.deleteRoom(roomId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Room not found",
        });
      }

      return res.json({
        success: true,
        message: `Room ${roomId} closed successfully`,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
