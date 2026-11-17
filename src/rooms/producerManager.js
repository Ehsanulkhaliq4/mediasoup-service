class ProducerManager {

  async createProducer(room, participantId, transportId, kind, rtpParameters, appData = {}) {
    const participant = room.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const transportData = participant.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    if (transportData.direction !== "send") {
      throw new Error("Producer must use a send transport");
    }

    const producer = await transportData.transport.produce({
      kind,
      rtpParameters,
      appData: {
        ...appData,
        participantId,
        displayName: participant.displayName,
      },
    });

    participant.producers.set(producer.id, producer);

    // Update participant states
    if (kind === "audio") {
      participant.isMutedAudio = false;
      // Add audio producer to the audio level observer
      if (room.audioLevelObserver) {
        try {
          await room.audioLevelObserver.addProducer({ producerId: producer.id });
        } catch (_) {}
      }
    } else if (kind === "video") {
      if (appData.mediaType === "screen") {
        participant.isScreenSharing = true;
      } else {
        participant.isMutedVideo = false;
      }
    }

    producer.on("transportclose", () => {
      this.closeProducer(room, participant, producer.id);
    });

    return producer;
  }

  getProducer(participant, producerId) {
    const producer = participant.producers.get(producerId);
    if (!producer) {
      throw new Error(`Producer not found: ${producerId}`);
    }
    return producer;
  }

  async pauseProducer(room, participant, producerId) {
    const producer = participant.producers.get(producerId);
    if (!producer) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    await producer.pause();

    if (producer.kind === "audio") {
      participant.isMutedAudio = true;
    } else if (producer.kind === "video" && producer.appData?.mediaType !== "screen") {
      participant.isMutedVideo = true;
    }

    return producer;
  }

  async resumeProducer(room, participant, producerId) {
    const producer = participant.producers.get(producerId);
    if (!producer) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    await producer.resume();

    if (producer.kind === "audio") {
      participant.isMutedAudio = false;
    } else if (producer.kind === "video" && producer.appData?.mediaType !== "screen") {
      participant.isMutedVideo = false;
    }

    return producer;
  }

  closeProducer(room, participant, producerId) {
    const producer = participant.producers.get(producerId);
    if (!producer) {
      return false;
    }

    if (producer.kind === "audio" && room?.audioLevelObserver) {
      // removeProducer() is async and rejects when the producer was already
      // closed by the worker (e.g. during transport teardown). Swallow that
      // rejection so it cannot crash the whole SFU process.
      void Promise.resolve(
        room.audioLevelObserver.removeProducer({ producerId: producer.id })
      ).catch(() => {});
    }

    if (producer.appData?.mediaType === "screen") {
      participant.isScreenSharing = false;
    }

    try {
      producer.close();
    } catch (_) {}

    participant.producers.delete(producerId);
    return true;
  }

  getProducers(participant) {
    return participant.producers;
  }
}

export default new ProducerManager();