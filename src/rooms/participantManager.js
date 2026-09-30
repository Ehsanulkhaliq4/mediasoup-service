class ParticipantManager {

    addParticipant(room, participantId) {

        if (room.participants.has(participantId)) {
            throw new Error(
                `Participant already exists: ${participantId}`
            );
        }

        const participant = {
            id: participantId,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map()
        };

        room.participants.set(
            participantId,
            participant
        );

        console.log(
            `Participant ${participantId} joined room ${room.id}`
        );

        return participant;
    }

    getParticipant(room, participantId) {
        return room.participants.get(participantId);
    }

    hasParticipant(room, participantId) {
        return room.participants.has(participantId);
    }

    removeParticipant(room, participantId) {

        const participant =
            room.participants.get(participantId);

        if (!participant) {
            return false;
        }

        // Close all transports
        for (const transport of participant.transports.values()) {
            transport.close();
        }

        room.participants.delete(participantId);

        console.log(
            `Participant ${participantId} left room ${room.id}`
        );

        return true;
    }

    getParticipants(room) {
        return room.participants;
    }
}

export default new ParticipantManager();