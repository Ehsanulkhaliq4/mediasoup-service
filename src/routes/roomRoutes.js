import express from "express";

export function createRoomRoutes(roomManager, worker) {
  const router = express.Router();

  // POST /api/rooms
  router.post("/", async (req, res) => {
    try {
      const { roomId } = req.body;

      if (!roomId) {
        return res.status(400).json({
          error: "roomId is required",
        });
      }

      const room = await roomManager.createRoom(worker, roomId);

      return res.status(201).json({
        message: "Room created successfully",
        roomId: room.id,
        routerId: room.router.id,
      });
    } catch (error) {
      console.error("Create room error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  });

  return router;
}
