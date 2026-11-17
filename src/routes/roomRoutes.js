import express from "express";
import { getMediasoupWorker } from "../mediasoup/worker.js";
import { generateRoomId, validateRoomId } from "../rooms/roomManager.js";

export function createRoomRoutes(roomManager, workerPool) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const requestedRoomId = req.body?.roomId;
      const title = req.body?.title;
      const roomId = requestedRoomId
        ? validateRoomId(requestedRoomId)
        : generateRoomId();

      const alreadyExisted = roomManager.hasRoom(roomId);
      const worker = workerPool?.getNextWorker?.() || getMediasoupWorker();
      const room = await roomManager.createRoom(worker, roomId, { title });

      return res.status(alreadyExisted ? 200 : 201).json({
        success: true,
        created: !alreadyExisted,
        message: alreadyExisted
          ? "Room already active; returning the existing Router"
          : "Room created successfully",
        roomId: room.id,
        title: room.title,
        createdAt: room.createdAt,
        routerId: room.router.id,
        routerRtpCapabilities: room.router.rtpCapabilities,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
        code: error.code || "ROOM_CREATE_FAILED",
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
