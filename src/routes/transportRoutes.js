import express from "express";

export function createTransportRoutes(roomManager, transportManager) {
  const router = express.Router();

  router.post("/rooms/:roomId/transports", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, direction } = req.body;
      if (!userId) {
        return res.status(400).json({
          error: "userId is required",
        });
      }
      if (direction !== "send" && direction !== "recv") {
        return res.status(400).json({
          error: "direction must be 'send' or 'recv'",
        });
      }

      // ----------------------------------------
      // Find room
      // ----------------------------------------

      const room = roomManager.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          error: "Room not found",
        });
      }

      // ----------------------------------------
      // Find participant
      // ----------------------------------------

      const participant = room.participants.get(userId);

      if (!participant) {
        return res.status(404).json({
          error: "Participant not found",
        });
      }

      // ----------------------------------------
      // Create transport
      // ----------------------------------------

      const transport = await transportManager.createTransport(
        room,
        userId,
        direction,
      );

      // ----------------------------------------
      // Return transport information
      // ----------------------------------------

      return res.status(201).json({
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
      console.error("Create transport error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  });

  // --------------------------------------------------
  // GET user's transports
  // --------------------------------------------------

  router.get(
    "/rooms/:roomId/participants/:userId/transports",
    async (req, res) => {
      try {
        const { roomId, userId } = req.params;

        const room = roomManager.getRoom(roomId);

        if (!room) {
          return res.status(404).json({
            error: "Room not found",
          });
        }

        const participant = room.participants.get(userId);

        if (!participant) {
          return res.status(404).json({
            error: "Participant not found",
          });
        }

        const transports = Array.from(participant.transports.values()).map(
          (transport) => ({
            id: transport.id,

            direction: transport.appData?.direction,
          }),
        );

        return res.json({
          roomId,

          userId,

          totalTransports: transports.length,

          transports,
        });
      } catch (error) {
        console.error("Get transports error:", error);

        return res.status(500).json({
          error: error.message,
        });
      }
    },
  );

  return router;
}
