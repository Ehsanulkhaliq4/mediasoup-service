class ConsumerManager {

    async createConsumer(room,participantId,transportId,producerId) {
        const participant = room.participants.get(participantId);
        if (!participant) {
            throw new Error(`Participant not found: ${participantId}`);
        }
        const transportData = participant.transports.get(transportId);
        if (!transportData) {
            throw new Error(`Transport not found: ${transportId}`);
        }
        if (transportData.type !== "recv") {
            throw new Error("Consumer must use a receive transport");
        }
        let producer = null;
        for (const otherParticipant of room.participants.values()) {

            if (otherParticipant.producers.has(producerId)) {
                producer = otherParticipant.producers.get(producerId);
                break;
            }
        }

        if (!producer) {
            throw new Error(`Producer not found: ${producerId}`);
        }
        if (
            !room.router.canConsume({
                producerId: producer.id,
                rtpCapabilities: room.router.rtpCapabilities
            })
        ) {
            throw new Error(`Router cannot consume producer: ${producerId}`);
        }
        const consumer =
            await transportData.transport.consume({
                producerId: producer.id,
                rtpCapabilities: room.router.rtpCapabilities,
                paused: true
            });

        participant.consumers.set(
            consumer.id,
            consumer
        );

        console.log(`Consumer created for ${participantId}`);
        console.log(`Consumer ID: ${consumer.id}`);
        console.log(`Producer ID: ${producer.id}`);
        console.log(`Consumer kind: ${consumer.kind}`);
        consumer.on("transportclose", () => {
        console.log(`Consumer transport closed: ${consumer.id}`);
        participant.consumers.delete(consumer.id);
        });
        consumer.on("producerclose", () => {
            console.log(`Producer closed: ${producer.id}`);
            consumer.close();
            participant.consumers.delete(
                consumer.id
            );
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
        const consumer =
            this.getConsumer(
                participant,
                consumerId
            );

        await consumer.resume();
        console.log(`Consumer resumed: ${consumerId}`);
        return consumer;
    }

    closeConsumer(participant, consumerId) {

        const consumer = participant.consumers.get(consumerId);
        if (!consumer) {
            return false;
        }
        consumer.close();
        participant.consumers.delete(consumerId);
        console.log(`Consumer closed: ${consumerId}`);
        return true;
    }

    getConsumers(participant) {
        return participant.consumers;
    }
}


export default new ConsumerManager();