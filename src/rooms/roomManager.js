import { createRouter, createAudioObserver } from "../mediasoup/router.js";
import { getMediasoupWorker } from "../mediasoup/worker.js";

export const ROOM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

export class InvalidRoomIdError extends Error {
  constructor(roomId) {
    super(
      `Invalid roomId '${roomId}'. Use 3-64 URL-safe characters (letters, numbers, '-' or '_').`
    );
    this.name = "InvalidRoomIdError";
    this.code = "INVALID_ROOM_ID";
    this.roomId = roomId;
    this.statusCode = 400;
  }
}

export class RoomNotFoundError extends Error {
  constructor(roomId) {
    super(`Room '${roomId}' does not exist. Create the meeting first.`);
    this.name = "RoomNotFoundError";
    this.code = "ROOM_NOT_FOUND";
    this.roomId = roomId;
    this.statusCode = 404;
  }
}

export function normalizeRoomId(roomId) {
  return typeof roomId === "string" ? roomId.trim() : "";
}

export function validateRoomId(roomId) {
  const normalized = normalizeRoomId(roomId);
  if (!normalized) {
    throw new InvalidRoomIdError(roomId);
  }
  if (!ROOM_ID_PATTERN.test(normalized)) {
    throw new InvalidRoomIdError(normalized);
  }
  return normalized;
}

export function generateRoomId() {
  const shortCode =
    Math.random().toString(36).substring(2, 6) +
    "-" +
    Math.random().toString(36).substring(2, 6);
  return `conf-${shortCode}`;
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  async createRoom(worker, roomId, metadata = {}) {
    const normalizedRoomId = validateRoomId(roomId);

    if (this.rooms.has(normalizedRoomId)) {
      return this.rooms.get(normalizedRoomId);
    }

    const assignedWorker = worker || getMediasoupWorker();
    const router = await createRouter(assignedWorker);
    const audioLevelObserver = await createAudioObserver(router);

    const room = {
      id: normalizedRoomId,
      title: metadata.title || `Room ${normalizedRoomId}`,
      createdAt: new Date(),
      worker: assignedWorker,
      router,
      audioLevelObserver,
      participants: new Map(),
      chatMessages: [],
      activeSpeaker: null,
      hostParticipantId: metadata.hostParticipantId || null,
      hostLocked: Boolean(metadata.hostParticipantId),
    };

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

    this.rooms.set(normalizedRoomId, room);
    return room;
  }

  getRoom(roomId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    return this.rooms.get(normalizedRoomId);
  }
  getRoomOrThrow(roomId) {
    const normalizedRoomId = validateRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      throw new RoomNotFoundError(normalizedRoomId);
    }
    return room;
  }

  hasRoom(roomId) {
    return this.rooms.has(normalizeRoomId(roomId));
  }

  deleteRoom(roomId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
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

    this.rooms.delete(normalizedRoomId);
    return true;
  }

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

  getRoomSummary(roomId) {
    const room = this.rooms.get(normalizeRoomId(roomId));
    if (!room) return null;

    const participants = Array.from(room.participants.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      joinedAt: p.joinedAt,
      isHost: p.id === room.hostParticipantId,
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
      hostParticipantId: room.hostParticipantId,
    };
  }
}

export default new RoomManager();