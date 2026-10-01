import { createRouter, createAudioObserver } from "../mediasoup/router.js";
import { getMediasoupWorker } from "../mediasoup/worker.js";

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Create a new meeting room
   * @param {string} roomId
   * @param {object} [metadata]
   * @returns {Promise<object>}
   */
  async createRoom(worker, roomId, metadata = {}) {
    if (!roomId) {
      throw new Error("roomId is required");
    }

    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const assignedWorker = worker || getMediasoupWorker();
    const router = await createRouter(assignedWorker);
    const audioLevelObserver = await createAudioObserver(router);

    const room = {
      id: roomId,
      title: metadata.title || `Room ${roomId}`,
      createdAt: new Date(),
      worker: assignedWorker,
      router,
      audioLevelObserver,
      participants: new Map(),
      chatMessages: [],
      activeSpeaker: null,
    };

    // Active speaker detection
    audioLevelObserver.on("volumes", (volumes) => {
      const { producer, volume } = volumes[0];
      if (producer && !producer.closed) {
        // Find which participant owns this audio producer
        for (const participant of room.participants.values()) {
          if (participant.producers.has(producer.id)) {
            room.activeSpeaker = {
              participantId: participant.id,
              displayName: participant.displayName,
              volume,
            };
            if (room.onActiveSpeaker) {
              room.onActiveSpeaker(room.activeSpeaker);
            }
            break;
          }
        }
      }
    });

    audioLevelObserver.on("silence", () => {
      room.activeSpeaker = null;
      if (room.onActiveSpeaker) {
        room.onActiveSpeaker(null);
      }
    });

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * Closes and removes a room and its router
   */
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Close all participant resources
    for (const participant of room.participants.values()) {
      for (const transport of participant.transports.values()) {
        try {
          transport.transport.close();
        } catch (_) {}
      }
    }

    if (room.audioLevelObserver) {
      try {
        room.audioLevelObserver.close();
      } catch (_) {}
    }

    if (room.router) {
      try {
        room.router.close();
      } catch (_) {}
    }

    this.rooms.delete(roomId);
    return true;
  }

  /**
   * Get all active rooms formatted for API responses
   */
  getAllRooms() {
    const list = [];
    for (const room of this.rooms.values()) {
      let totalProducers = 0;
      for (const p of room.participants.values()) {
        totalProducers += p.producers.size;
      }

      list.push({
        id: room.id,
        title: room.title,
        createdAt: room.createdAt,
        participantCount: room.participants.size,
        producerCount: totalProducers,
      });
    }
    return list;
  }

  /**
   * Get comprehensive stats for a specific room
   */
  getRoomSummary(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const participants = Array.from(room.participants.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      joinedAt: p.joinedAt,
      isMutedAudio: p.isMutedAudio,
      isMutedVideo: p.isMutedVideo,
      isScreenSharing: p.isScreenSharing,
      isHandRaised: p.isHandRaised,
      producers: Array.from(p.producers.values()).map((pr) => ({
        id: pr.id,
        kind: pr.kind,
        type: pr.appData?.mediaType || pr.kind,
        paused: pr.paused,
      })),
      consumersCount: p.consumers.size,
    }));

    return {
      id: room.id,
      title: room.title,
      createdAt: room.createdAt,
      totalParticipants: participants.length,
      participants,
      activeSpeaker: room.activeSpeaker,
    };
  }
}

export default new RoomManager();