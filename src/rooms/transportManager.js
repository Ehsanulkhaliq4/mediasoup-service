import { createWebRtcTransport } from "../mediasoup/transport.js";

class TransportManager {
  /**
   * Creates a WebRTC transport for a participant
   * @param {object} room
   * @param {string} participantId
   * @param {'send' | 'recv'} direction
   * @returns {Promise<import('mediasoup').types.WebRtcTransport>}
   */
  async createTransport(room, participantId, direction) {
    const participant = room.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    if (direction !== "send" && direction !== "recv") {
      throw new Error(`Invalid transport direction: ${direction}. Must be 'send' or 'recv'`);
    }

    const transport = await createWebRtcTransport(room.router);

    participant.transports.set(transport.id, {
      id: transport.id,
      direction,
      transport,
    });

    return transport;
  }

  /**
   * Connects a WebRTC transport with client DTLS parameters
   */
  async connectTransport(participant, transportId, dtlsParameters) {
    const transportData = participant.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    await transportData.transport.connect({ dtlsParameters });
    return transportData.transport;
  }

  /**
   * Closes a transport for a participant
   */
  closeTransport(participant, transportId) {
    const transportData = participant.transports.get(transportId);
    if (!transportData) {
      return false;
    }
    try {
      transportData.transport.close();
    } catch (_) {}
    participant.transports.delete(transportId);
    return true;
  }

  /**
   * Get transport stats
   */
  async getTransportStats(participant, transportId) {
    const transportData = participant.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }
    return await transportData.transport.getStats();
  }
}

export default new TransportManager();