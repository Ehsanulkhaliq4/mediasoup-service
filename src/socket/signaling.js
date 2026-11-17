import { Server } from "socket.io";
import roomManager, {
  validateRoomId,
  normalizeRoomId,
} from "../rooms/roomManager.js";
import participantManager from "../rooms/participantManager.js";
import transportManager from "../rooms/transportManager.js";
import producerManager from "../rooms/producerManager.js";
import consumerManager from "../rooms/consumerManager.js";


export function initializeSignaling(httpServer, corsConfig) {
  const io = new Server(httpServer, {
    cors: corsConfig,
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    let currentRoomId = null;
    let currentParticipantId = null;

    // ----------------------------------------------------
    // 1. Join Room
    // ----------------------------------------------------
    socket.on("join-room", async (payload, callback) => {
      const respond = typeof callback === "function" ? callback : () => {};

      try {
        const roomId = validateRoomId(payload?.roomId);
        const participantId =
          typeof payload?.participantId === "string"
            ? payload.participantId.trim()
            : "";
        const displayName =
          typeof payload?.displayName === "string"
            ? payload.displayName.trim()
            : "";

        if (!participantId) {
          return respond({
            error: "participantId is required",
            code: "PARTICIPANT_ID_REQUIRED",
          });
        }

        if (
          currentRoomId &&
          (currentRoomId !== roomId || currentParticipantId !== participantId)
        ) {
          handleLeave();
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return respond({
            error: `Room '${roomId}' is not active. Create the meeting first or check the invite link.`,
            code: "ROOM_NOT_FOUND",
            roomId,
          });
        }

        currentRoomId = room.id;
        currentParticipantId = participantId;

        const requestedHost = payload?.isHost === true;
        const previousHostId = room.hostParticipantId;
        if (!room.hostParticipantId) {
          room.hostParticipantId = participantId;
          room.hostLocked = requestedHost;
        } else if (requestedHost && !room.hostLocked) {
          room.hostParticipantId = participantId;
          room.hostLocked = true;
        }
        const isHost = room.hostParticipantId === participantId;

        const participant = participantManager.addParticipant(room, participantId, {
          displayName: displayName || `User_${participantId.substring(0, 5)}`,
        });
        if (previousHostId !== room.hostParticipantId) {
          io.to(room.id).emit("host-changed", {
            hostParticipantId: room.hostParticipantId,
            participantId,
          });
        }

        // Attach active speaker hook if not already set
        if (!room.onActiveSpeaker) {
          room.onActiveSpeaker = (speakerData) => {
            io.to(room.id).emit("active-speaker", speakerData);
          };
        }

        // Join the Socket.IO room using the canonical room id.
        socket.join(room.id);

        // Gather existing participants and their active producers
        const existingPeers = [];
        for (const [pId, p] of room.participants.entries()) {
          if (pId !== participantId) {
            const producersList = Array.from(p.producers.values()).map((pr) => ({
              producerId: pr.id,
              kind: pr.kind,
              mediaType: pr.appData?.mediaType || pr.kind,
              paused: pr.paused,
            }));

            existingPeers.push({
              participantId: p.id,
              displayName: p.displayName,
              isHost: p.id === room.hostParticipantId,
              isMutedAudio: p.isMutedAudio,
              isMutedVideo: p.isMutedVideo,
              isScreenSharing: p.isScreenSharing,
              isHandRaised: p.isHandRaised,
              producers: producersList,
            });
          }
        }

        // Notify other participants in the room
        socket.to(room.id).emit("participant-joined", {
          participantId: participant.id,
          displayName: participant.displayName,
          isHost,
        });

        respond({
          success: true,
          roomId: room.id,
          routerId: room.router.id,
          routerRtpCapabilities: room.router.rtpCapabilities,
          participantId: participant.id,
          isHost,
          hostParticipantId: room.hostParticipantId,
          createdAt: room.createdAt,
          peers: existingPeers,
          chatHistory: room.chatMessages.slice(-50),
        });
      } catch (err) {
        respond({
          error: err.message,
          code: err.code || "JOIN_FAILED",
          roomId: normalizeRoomId(payload?.roomId),
        });
      }
    });

    // ----------------------------------------------------
    // 2. Get Router RTP Capabilities
    // ----------------------------------------------------
    socket.on("get-router-rtp-capabilities", ({ roomId }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });
        callback({ routerRtpCapabilities: room.router.rtpCapabilities });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 3. Create WebRTC Transport
    // ----------------------------------------------------
    socket.on("create-webrtc-transport", async ({ roomId, participantId, direction }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const transport = await transportManager.createTransport(room, participantId, direction);

        callback({
          params: {
            id: transport.id,
            direction,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 4. Connect Transport (DTLS)
    // ----------------------------------------------------
    socket.on("connect-transport", async ({ roomId, participantId, transportId, dtlsParameters }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const participant = participantManager.getParticipant(room, participantId);
        if (!participant) return callback({ error: "Participant not found" });

        await transportManager.connectTransport(participant, transportId, dtlsParameters);
        callback({ success: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 5. Produce Media
    // ----------------------------------------------------
    socket.on("produce", async ({ roomId, participantId, transportId, kind, rtpParameters, appData }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const participant = participantManager.getParticipant(room, participantId);
        if (!participant) return callback({ error: "Participant not found" });

        const producer = await producerManager.createProducer(
          room,
          participantId,
          transportId,
          kind,
          rtpParameters,
          appData || {}
        );

        // Broadcast to all other peers in the room that a new producer is available
        socket.to(room.id).emit("new-producer", {
          producerId: producer.id,
          participantId,
          displayName: participant.displayName,
          kind: producer.kind,
          mediaType: appData?.mediaType || producer.kind,
        });

        callback({ id: producer.id });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 6. Consume Media
    // ----------------------------------------------------
    socket.on("consume", async ({ roomId, participantId, transportId, producerId, rtpCapabilities }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const consumer = await consumerManager.createConsumer(
          room,
          participantId,
          transportId,
          producerId,
          rtpCapabilities
        );

        callback({
          params: {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type,
            producerPaused: consumer.producerPaused,
            appData: consumer.appData,
          },
        });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 7. Resume Consumer
    // ----------------------------------------------------
    socket.on("consumer-resume", async ({ roomId, participantId, consumerId }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback?.({ error: "Room not found" });

        const participant = participantManager.getParticipant(room, participantId);
        if (!participant) return callback?.({ error: "Participant not found" });

        await consumerManager.resumeConsumer(participant, consumerId);
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 8. Producer Pause / Resume (Mute / Unmute)
    // ----------------------------------------------------
    socket.on("producer-pause", async ({ roomId, participantId, producerId }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback?.({ error: "Room not found" });

        const participant = participantManager.getParticipant(room, participantId);
        if (!participant) return callback?.({ error: "Participant not found" });

        await producerManager.pauseProducer(room, participant, producerId);

        socket.to(roomId).emit("producer-paused", {
          producerId,
          participantId,
        });

        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on("producer-resume", async ({ roomId, participantId, producerId }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback?.({ error: "Room not found" });

        const participant = participantManager.getParticipant(room, participantId);
        if (!participant) return callback?.({ error: "Participant not found" });

        await producerManager.resumeProducer(room, participant, producerId);

        socket.to(roomId).emit("producer-resumed", {
          producerId,
          participantId,
        });

        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 9. Close Producer (Stop Track e.g. Screen Share)
    // ----------------------------------------------------
    socket.on("producer-close", ({ roomId, participantId, producerId }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (room) {
          const participant = participantManager.getParticipant(room, participantId);
          if (participant) {
            producerManager.closeProducer(room, participant, producerId);
          }
          socket.to(roomId).emit("producer-closed", {
            producerId,
            participantId,
          });
        }
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 10. In-Meeting Chat
    // ----------------------------------------------------
    socket.on("send-chat-message", ({ roomId, participantId, displayName, text }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback?.({ error: "Room not found" });

        const message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          participantId,
          displayName: displayName || "User",
          text: text.trim(),
          timestamp: new Date().toISOString(),
        };

        room.chatMessages.push(message);
        if (room.chatMessages.length > 200) {
          room.chatMessages.shift();
        }

        io.to(roomId).emit("chat-message", message);
        callback?.({ success: true, message });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 11. Raise / Lower Hand
    // ----------------------------------------------------
    socket.on("toggle-hand-raise", ({ roomId, participantId, isHandRaised }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback?.({ error: "Room not found" });

        const participant = participantManager.getParticipant(room, participantId);
        if (participant) {
          participant.isHandRaised = Boolean(isHandRaised);
          io.to(roomId).emit("hand-raised-updated", {
            participantId,
            displayName: participant.displayName,
            isHandRaised: participant.isHandRaised,
          });
        }
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 12. End Meeting (host only)
    // ----------------------------------------------------
    socket.on("end-meeting", ({ roomId, participantId }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          return callback?.({ error: "Room not found", code: "ROOM_NOT_FOUND" });
        }

        if (room.hostParticipantId && room.hostParticipantId !== participantId) {
          return callback?.({
            error: "Only the meeting host can end the meeting.",
            code: "NOT_HOST",
          });
        }

        // Notify everyone except the host that initiated the action; the host
        // resets its own UI as soon as the acknowledgement arrives.
        socket.to(room.id).emit("meeting-ended", {
          roomId: room.id,
          reason: "host-ended",
          endedBy: participantId,
        });

        roomManager.deleteRoom(room.id);
        currentRoomId = null;
        currentParticipantId = null;
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // 13. Leave Room / Disconnect
    // ----------------------------------------------------
    const handleLeave = () => {
      const roomId = currentRoomId;
      const participantId = currentParticipantId;
      if (!roomId || !participantId) return;

      currentRoomId = null;
      currentParticipantId = null;
      socket.leave(roomId);

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const participant = participantManager.getParticipant(room, participantId);
      const name = participant?.displayName || participantId;
      const wasHost = room.hostParticipantId === participantId;

      // Clean up participant
      participantManager.removeParticipant(room, participantId);

      // Promote the next participant so the room never keeps a stale host id.
      if (wasHost) {
        const nextHost = room.participants.values().next().value;
        room.hostParticipantId = nextHost ? nextHost.id : null;
        room.hostLocked = Boolean(nextHost);
        if (nextHost) {
          io.to(room.id).emit("host-changed", {
            hostParticipantId: nextHost.id,
            participantId: nextHost.id,
          });
        }
      }

      // Notify remaining participants
      socket.to(roomId).emit("participant-left", {
        participantId,
        displayName: name,
      });

      // If room is empty, delete it after a grace period of 30 seconds
      if (room.participants.size === 0) {
        setTimeout(() => {
          const r = roomManager.getRoom(roomId);
          if (r && r.participants.size === 0) {
            roomManager.deleteRoom(roomId);
          }
        }, 30000);
      }
    };

    socket.on("leave-room", handleLeave);
    socket.on("disconnect", () => {
      handleLeave();
    });
  });

  return io;
}
