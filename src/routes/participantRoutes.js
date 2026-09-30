import express from "express";

export function createParticipantRoutes(roomManager, participantManager) {
  const router = express.Router();

  // --------------------------------------------------
  // POST /api/rooms/:roomId/participants
  // --------------------------------------------------

  router.post("/rooms/:roomId/participants", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: "userId is required",
        });
      }

      const room = roomManager.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          error: "Room not found",
        });
      }

      const participant = participantManager.addParticipant(room, userId);

      return res.status(201).json({
        message: "Participant joined successfully",
        roomId: room.id,
        userId: participant.id,
      });
    } catch (error) {
      console.error("Join participant error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  });

  // --------------------------------------------------
  // GET /api/rooms/:roomId/participants
  // --------------------------------------------------

  router.get("/rooms/:roomId/participants", async (req, res) => {
    try {
      const { roomId } = req.params;

      const room = roomManager.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          error: "Room not found",
        });
      }

      const participants = Array.from(room.participants.values()).map(
        (participant) => ({
          userId: participant.id,
          transportCount: participant.transports.size,
          producerCount: participant.producers.size,
          consumerCount: participant.consumers.size,
        }),
      );

      return res.json({
        roomId: room.id,
        totalParticipants: participants.length,
        participants,
      });
    } catch (error) {
      console.error("Get participants error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  });

  return router;
}
