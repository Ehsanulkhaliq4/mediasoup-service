import { createWebRtcTransport } from "../mediasoup/transport.js";

class TransportManager{
    async createTransport(room, participantId, type){

        const participant = room.participants.get(participantId);
        if(!participant){
            throw new Error(`Participant not found: ${participantId}`);
        }

        if(type !== "send" && type !== "recv"){
            throw new Error(`Invalid transport type: ${type}`);
        }

        const transport = await createWebRtcTransport(room.router);

        participant.transports.set(
            transport.id,
            {
                id: transport.id,
                type,
                transport
            }
        );

        console.log(`${type} transport created for ${participantId}`);

        return transport;
    }

    closeTransport(participant, transportId) {

        const transportData = participant.transports.get(transportId);

        if (!transportData) {
            return false;
        }
        transportData.transport.close();
        participant.transports.delete(transportId);
        console.log(`Transport closed: ${transportId}`);

        return true;
    }
}

export default new TransportManager();