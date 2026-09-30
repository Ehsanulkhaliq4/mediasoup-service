class ProducerManager {
    async createProducer(room,participantId,transportId,kind,rtpParameters) {
        const participant = room.participants.get(participantId);
        if (!participant) {
            throw new Error(`Participant not found: ${participantId}`);
        }
        const transportData = participant.transports.get(transportId);
        if (!transportData) {
            throw new Error(`Transport not found: ${transportId}`);
        }

        if (transportData.type !== "send") {
            throw new Error("Producer must use a send transport");
        }

        const producer = await transportData.transport.produce({kind,rtpParameters});
        participant.producers.set(producer.id,producer);
        console.log(`Producer created for ${participantId}`);
        console.log(`Producer ID: ${producer.id}`);
        console.log(`Producer kind: ${producer.kind}`);
        producer.on("transportclose", () => {
        console.log(`Producer transport closed: ${producer.id}`);
        participant.producers.delete(producer.id);});
        return producer;
    }

    getProducer(participant, producerId) {
        const producer = participant.producers.get(producerId);
        if (!producer) {
            throw new Error(`Producer not found: ${producerId}`);
        }
        return producer;
    }

    closeProducer(participant, producerId) {

        const producer = participant.producers.get(producerId);
        if (!producer) {
            return false;
        }
        producer.close();
        participant.producers.delete(producerId);
        console.log(`Producer closed: ${producerId}`);
        return true;
    }

    getProducers(participant) {
        return participant.producers;
    }
}

export default new ProducerManager();