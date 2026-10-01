import express from "express";

export function createConsumerRoutes(roomManager, consumerManager) {
  const router = express.Router();

  // POST /api/rooms/:roomId/consumers - Create a consumer
  router.post("/rooms/:roomId/consumers", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, transportId, producerId, rtpCapabilities } = req.body;

      if (!userId || !transportId || !producerId) {
        return res.status(400).json({
          success: false,
          error: "userId, transportId, and producerId are required",
        });
      }

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const consumer = await consumerManager.createConsumer(
        room,
        userId,
        transportId,
        producerId,
        rtpCapabilities
      );

      return res.status(201).json({
        success: true,
        message: "Consumer created successfully",
        consumer: {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused,
          appData: consumer.appData,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/rooms/:roomId/consumers/:consumerId/resume
  router.post("/rooms/:roomId/consumers/:consumerId/resume", async (req, res) => {
    try {
      const { roomId, consumerId } = req.params;
      const { userId } = req.body;

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      await consumerManager.resumeConsumer(participant, consumerId);

      return res.json({
        success: true,
        message: "Consumer resumed successfully",
        consumerId,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/rooms/:roomId/consumers/:consumerId/pause
  router.post("/rooms/:roomId/consumers/:consumerId/pause", async (req, res) => {
    try {
      const { roomId, consumerId } = req.params;
      const { userId } = req.body;

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      await consumerManager.pauseConsumer(participant, consumerId);

      return res.json({
        success: true,
        message: "Consumer paused successfully",
        consumerId,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/rooms/:roomId/consumers/:consumerId - Close consumer
  router.delete("/rooms/:roomId/consumers/:consumerId", (req, res) => {
    try {
      const { roomId, consumerId } = req.params;
      const { userId } = req.body;

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      const closed = consumerManager.closeConsumer(participant, consumerId);
      if (!closed) return res.status(404).json({ success: false, error: "Consumer not found" });

      return res.json({
        success: true,
        message: "Consumer closed successfully",
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
