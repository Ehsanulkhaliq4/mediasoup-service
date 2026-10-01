import express from "express";

export function createProducerRoutes(roomManager, producerManager) {
  const router = express.Router();

  // POST /api/rooms/:roomId/producers - Create a producer
  router.post("/rooms/:roomId/producers", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, transportId, kind, rtpParameters, appData } = req.body;

      if (!userId || !transportId || !kind || !rtpParameters) {
        return res.status(400).json({
          success: false,
          error: "userId, transportId, kind, and rtpParameters are required",
        });
      }

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const producer = await producerManager.createProducer(
        room,
        userId,
        transportId,
        kind,
        rtpParameters,
        appData || {}
      );

      return res.status(201).json({
        success: true,
        message: "Producer created successfully",
        producerId: producer.id,
        kind: producer.kind,
        type: producer.type,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/rooms/:roomId/producers/:producerId/pause
  router.post("/rooms/:roomId/producers/:producerId/pause", async (req, res) => {
    try {
      const { roomId, producerId } = req.params;
      const { userId } = req.body;

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      await producerManager.pauseProducer(room, participant, producerId);

      return res.json({
        success: true,
        message: "Producer paused successfully",
        producerId,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/rooms/:roomId/producers/:producerId/resume
  router.post("/rooms/:roomId/producers/:producerId/resume", async (req, res) => {
    try {
      const { roomId, producerId } = req.params;
      const { userId } = req.body;

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      await producerManager.resumeProducer(room, participant, producerId);

      return res.json({
        success: true,
        message: "Producer resumed successfully",
        producerId,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/rooms/:roomId/producers/:producerId - Close producer
  router.delete("/rooms/:roomId/producers/:producerId", (req, res) => {
    try {
      const { roomId, producerId } = req.params;
      const { userId } = req.body;

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      const closed = producerManager.closeProducer(room, participant, producerId);
      if (!closed) return res.status(404).json({ success: false, error: "Producer not found" });

      return res.json({
        success: true,
        message: "Producer closed successfully",
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
