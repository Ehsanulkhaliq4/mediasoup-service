import { createRouter } from "../mediasoup/router.js";

class RoomManager {
    constructor(){
        this.rooms = new Map();
    }

    async createRoom(worker, roomId){
        if (this.rooms.has(roomId)) {
            throw new Error(`Room already exists: ${roomId}`);
        }

        const router = await createRouter(worker);

        const room = {
            id: roomId,
            router,
            participants: new Map()
        };

        this.rooms.set(roomId, room);

        console.log(`Room created: ${roomId}`);
        console.log(`Router ID: ${router.id}`);

        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    hasRoom(roomId) {
        return this.rooms.has(roomId);
    }

    deleteRoom(roomId){
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }
        room.router.close();
        this.rooms.delete(roomId);
        console.log(`Room deleted: ${roomId}`);
        return true;
    }

    getRooms() {
        return this.rooms;
    }
}
export default new RoomManager();