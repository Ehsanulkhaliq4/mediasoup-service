class ParticipantManager {
  /**
   * Adds or registers a participant in a room
   * @param {object} room
   * @param {string} participantId
   * @param {object} [metadata]
   * @returns {object} participant
   */
  addParticipant(room, participantId, metadata = {}) {
    if (room.participants.has(participantId)) {
      // Reconnection: update metadata and return existing
      const existing = room.participants.get(participantId);
      if (metadata.displayName) existing.displayName = metadata.displayName;
      return existing;
    }

    const participant = {
      id: participantId,
      displayName: metadata.displayName || `User_${participantId.substring(0, 5)}`,
      joinedAt: new Date(),
      isMutedAudio: true,
      isMutedVideo: true,
      isScreenSharing: false,
      isHandRaised: false,
      transports: new Map(), // transportId -> { id, type, transport }
      producers: new Map(),  // producerId -> producer
      consumers: new Map(),  // consumerId -> consumer
    };

    room.participants.set(participantId, participant);
    return participant;
  }

  getParticipant(room, participantId) {
    return room.participants.get(participantId);
  }

  hasParticipant(room, participantId) {
    return room.participants.has(participantId);
  }

  /**
   * Fully cleans up all resources of a participant upon leaving
   */
  removeParticipant(room, participantId) {
    const participant = room.participants.get(participantId);
    if (!participant) {
      return false;
    }

    // Close all consumers
    for (const consumer of participant.consumers.values()) {
      try {
        consumer.close();
      } catch (_) {}
    }
    participant.consumers.clear();

    // Close all producers
    for (const producer of participant.producers.values()) {
      try {
        producer.close();
      } catch (_) {}
    }
    participant.producers.clear();

    // Close all transports
    for (const transportData of participant.transports.values()) {
      try {
        transportData.transport.close();
      } catch (_) {}
    }
    participant.transports.clear();

    room.participants.delete(participantId);
    return true;
  }

  getParticipants(room) {
    return room.participants;
  }
}

export default new ParticipantManager();