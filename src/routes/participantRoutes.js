import express from "express";

export function createParticipantRoutes(roomManager, participantManager) {
  const router = express.Router();

  // POST /api/rooms/:roomId/participants
  router.post("/rooms/:roomId/participants", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, displayName } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
        });
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          error: "Room not found",
        });
      }

      const participant = participantManager.addParticipant(room, userId, { displayName });

      return res.status(201).json({
        success: true,
        message: "Participant registered successfully",
        roomId: room.id,
        participant: {
          id: participant.id,
          displayName: participant.displayName,
          joinedAt: participant.joinedAt,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/rooms/:roomId/participants
  router.get("/rooms/:roomId/participants", (req, res) => {
    try {
      const { roomId } = req.params;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: "Room not found",
        });
      }

      const participants = Array.from(room.participants.values()).map(
        (participant) => ({
          id: participant.id,
          displayName: participant.displayName,
          joinedAt: participant.joinedAt,
          isMutedAudio: participant.isMutedAudio,
          isMutedVideo: participant.isMutedVideo,
          isScreenSharing: participant.isScreenSharing,
          isHandRaised: participant.isHandRaised,
          transportCount: participant.transports.size,
          producerCount: participant.producers.size,
          consumerCount: participant.consumers.size,
        })
      );

      return res.json({
        success: true,
        roomId: room.id,
        totalParticipants: participants.length,
        participants,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // DELETE /api/rooms/:roomId/participants/:participantId
  router.delete("/rooms/:roomId/participants/:participantId", (req, res) => {
    try {
      const { roomId, participantId } = req.params;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: "Room not found",
        });
      }

      const removed = participantManager.removeParticipant(room, participantId);
      if (!removed) {
        return res.status(404).json({
          success: false,
          error: "Participant not found",
        });
      }

      return res.json({
        success: true,
        message: `Participant ${participantId} removed`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}
