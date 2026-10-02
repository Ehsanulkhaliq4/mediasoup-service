class ConsumerManager {
 
  async createConsumer(room, participantId, transportId, producerId, rtpCapabilities) {
    const participant = room.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const transportData = participant.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    if (transportData.direction !== "recv") {
      throw new Error("Consumer must use a recv transport");
    }

    // Locate the producer across all room participants
    let targetProducer = null;
    let producerParticipant = null;

    for (const p of room.participants.values()) {
      if (p.producers.has(producerId)) {
        targetProducer = p.producers.get(producerId);
        producerParticipant = p;
        break;
      }
    }

    if (!targetProducer) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    const canConsume = room.router.canConsume({
      producerId: targetProducer.id,
      rtpCapabilities: rtpCapabilities || room.router.rtpCapabilities,
    });

    if (!canConsume) {
      throw new Error(`Cannot consume producer ${producerId} with provided RTP capabilities`);
    }

    const consumer = await transportData.transport.consume({
      producerId: targetProducer.id,
      rtpCapabilities: rtpCapabilities || room.router.rtpCapabilities,
      paused: true,
      appData: {
        producerId: targetProducer.id,
        producerParticipantId: producerParticipant?.id,
        producerDisplayName: producerParticipant?.displayName,
        mediaType: targetProducer.appData?.mediaType || targetProducer.kind,
      },
    });

    participant.consumers.set(consumer.id, consumer);

    consumer.on("transportclose", () => {
      this.closeConsumer(participant, consumer.id);
    });

    consumer.on("producerclose", () => {
      this.closeConsumer(participant, consumer.id);
    });

    return consumer;
  }

  getConsumer(participant, consumerId) {
    const consumer = participant.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    return consumer;
  }

  async resumeConsumer(participant, consumerId) {
    const consumer = this.getConsumer(participant, consumerId);
    await consumer.resume();
    return consumer;
  }


  async pauseConsumer(participant, consumerId) {
    const consumer = this.getConsumer(participant, consumerId);
    await consumer.pause();
    return consumer;
  }

  closeConsumer(participant, consumerId) {
    const consumer = participant.consumers.get(consumerId);
    if (!consumer) {
      return false;
    }
    try {
      consumer.close();
    } catch (_) {}
    participant.consumers.delete(consumerId);
    return true;
  }

  getConsumers(participant) {
    return participant.consumers;
  }
}

export default new ConsumerManager();