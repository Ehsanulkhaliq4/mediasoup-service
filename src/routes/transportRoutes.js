import express from "express";

export function createTransportRoutes(roomManager, transportManager) {
  const router = express.Router();

  // POST /api/rooms/:roomId/transports - Create WebRTC Transport
  router.post("/rooms/:roomId/transports", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, direction } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
        });
      }

      if (direction !== "send" && direction !== "recv") {
        return res.status(400).json({
          success: false,
          error: "direction must be 'send' or 'recv'",
        });
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          error: "Room not found",
        });
      }

      const participant = room.participants.get(userId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          error: "Participant not found",
        });
      }

      const transport = await transportManager.createTransport(
        room,
        userId,
        direction
      );

      return res.status(201).json({
        success: true,
        message: "Transport created successfully",
        transport: {
          id: transport.id,
          direction,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/rooms/:roomId/transports/:transportId/connect - Connect DTLS
  router.post("/rooms/:roomId/transports/:transportId/connect", async (req, res) => {
    try {
      const { roomId, transportId } = req.params;
      const { userId, dtlsParameters } = req.body;

      if (!userId || !dtlsParameters) {
        return res.status(400).json({
          success: false,
          error: "userId and dtlsParameters are required",
        });
      }

      const room = roomManager.getRoom(roomId);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      const participant = room.participants.get(userId);
      if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

      await transportManager.connectTransport(participant, transportId, dtlsParameters);

      return res.json({
        success: true,
        message: "Transport connected successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/rooms/:roomId/participants/:userId/transports
  router.get(
    "/rooms/:roomId/participants/:userId/transports",
    async (req, res) => {
      try {
        const { roomId, userId } = req.params;

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return res.status(404).json({
            success: false,
            error: "Room not found",
          });
        }

        const participant = room.participants.get(userId);
        if (!participant) {
          return res.status(404).json({
            success: false,
            error: "Participant not found",
          });
        }

        const transports = Array.from(participant.transports.values()).map(
          (t) => ({
            id: t.id,
            direction: t.direction,
          })
        );

        return res.json({
          success: true,
          roomId,
          userId,
          totalTransports: transports.length,
          transports,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  return router;
}
