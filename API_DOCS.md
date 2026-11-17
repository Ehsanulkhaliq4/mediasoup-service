# 🎥 ZoomCloud — Mediasoup Conference API Documentation

This service provides a production-grade WebRTC SFU (Selective Forwarding Unit) conference engine based on **mediasoup v3**, **Express**, and **Socket.IO**.

---

## 🚀 Quick Usage (Zoom-like Workflow)

### 1. Create a Meeting & Get Shareable Invite Link
- **Web UI**: Open `http://localhost:3000` -> Click **"Start Meeting"** -> Copy the meeting link `http://localhost:3000/?room=conf-xxxx-yyyy`.
- **API**: Call `POST /api/rooms` to create a conference room. Send the room link or ID to attendees.

---

## 📡 REST API Reference

### Base URL: `http://localhost:3000/api`

### 1. Create a Conference Room
Create a new conference room with custom ID or auto-generated Zoom-like meeting code (`conf-xxxx-yyyy`).

- **Endpoint:** `POST /api/rooms`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "roomId": "optional-custom-room-id",
  "title": "Weekly Engineering Sync"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Room created successfully",
  "roomId": "conf-uzae-9yfm",
  "title": "Weekly Engineering Sync",
  "createdAt": "2026-10-01T05:23:42.907Z",
  "routerId": "725e48a1-9f02-4afe-8b05-170a7e6e5b67",
  "routerRtpCapabilities": { ... }
}
```

---

### 2. List All Active Rooms
- **Endpoint:** `GET /api/rooms`
- **Response (200 OK):**
```json
{
  "success": true,
  "totalRooms": 1,
  "rooms": [
    {
      "id": "conf-uzae-9yfm",
      "title": "Weekly Engineering Sync",
      "createdAt": "2026-10-01T05:23:42.907Z",
      "participantCount": 2,
      "producerCount": 4
    }
  ]
}
```

---

### 3. Get Room Details & Capabilities
- **Endpoint:** `GET /api/rooms/:roomId`
- **Response (200 OK):**
```json
{
  "success": true,
  "room": {
    "id": "conf-uzae-9yfm",
    "title": "Weekly Engineering Sync",
    "createdAt": "2026-10-01T05:23:42.907Z",
    "totalParticipants": 1,
    "participants": [
      {
        "id": "user_123",
        "displayName": "Alice",
        "isMutedAudio": false,
        "isMutedVideo": false,
        "isScreenSharing": false,
        "producers": [
          { "id": "prod_1", "kind": "audio", "type": "mic", "paused": false },
          { "id": "prod_2", "kind": "video", "type": "camera", "paused": false }
        ]
      }
    ],
    "activeSpeaker": null,
    "routerRtpCapabilities": { ... }
  }
}
```

---

### 4. Close / Delete Room
- **Endpoint:** `DELETE /api/rooms/:roomId`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Room conf-uzae-9yfm closed successfully"
}
```

---

### 5. Create WebRTC Transport
- **Endpoint:** `POST /api/rooms/:roomId/transports`
- **Request Body:**
```json
{
  "userId": "user_123",
  "direction": "send"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Transport created successfully",
  "transport": {
    "id": "trans_123",
    "direction": "send",
    "iceParameters": { ... },
    "iceCandidates": [ ... ],
    "dtlsParameters": { ... }
  }
}
```

---

### 6. Connect WebRTC Transport (DTLS)
- **Endpoint:** `POST /api/rooms/:roomId/transports/:transportId/connect`
- **Request Body:**
```json
{
  "userId": "user_123",
  "dtlsParameters": { ... }
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Transport connected successfully"
}
```

---

### 7. Produce Media (Audio / Video / Screen)
- **Endpoint:** `POST /api/rooms/:roomId/producers`
- **Request Body:**
```json
{
  "userId": "user_123",
  "transportId": "trans_123",
  "kind": "video",
  "rtpParameters": { ... },
  "appData": { "mediaType": "camera" }
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Producer created successfully",
  "producerId": "prod_abc123",
  "kind": "video"
}
```

---

### 8. System & Worker Health Metrics
- **Endpoint:** `GET /api/stats`
- **Response (200 OK):**
```json
{
  "success": true,
  "system": {
    "uptime": 120,
    "cpuCores": 8,
    "totalMemoryMB": 16384,
    "processMemoryMB": { "rss": 85, "heapUsed": 45 }
  },
  "conference": {
    "activeRooms": 1,
    "totalParticipants": 2,
    "totalProducers": 4,
    "workersCount": 4
  }
}
```

---

## ⚡ Socket.IO Real-Time Signaling Protocol

When building mobile apps or custom clients, connect to Socket.IO at `ws://<host>:<port>`:

### Client -> Server Events

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, participantId, displayName }` | Join room, receive router RTP capabilities, peers, chat history |
| `create-webrtc-transport` | `{ roomId, participantId, direction: 'send'\|'recv' }` | Request new WebRTC transport parameters |
| `connect-transport` | `{ roomId, participantId, transportId, dtlsParameters }` | Connect local WebRTC transport with DTLS |
| `produce` | `{ roomId, participantId, transportId, kind, rtpParameters, appData }` | Publish audio/video/screen track |
| `consume` | `{ roomId, participantId, transportId, producerId, rtpCapabilities }` | Subscribe to a remote producer |
| `consumer-resume` | `{ roomId, participantId, consumerId }` | Resume receiving media stream |
| `producer-pause` | `{ roomId, participantId, producerId }` | Mute microphone / turn off camera |
| `producer-resume` | `{ roomId, participantId, producerId }` | Unmute microphone / turn on camera |
| `producer-close` | `{ roomId, participantId, producerId }` | Stop track (e.g. stop screen sharing) |
| `send-chat-message` | `{ roomId, participantId, displayName, text }` | Send group message to room |
| `toggle-hand-raise` | `{ roomId, participantId, isHandRaised }` | Toggle hand raise indicator |
| `end-meeting` | `{ roomId, participantId }` | Host only: close the room for every participant |
| `leave-room` | None | Gracefully exit room and clean up resources |

### Server -> Client Broadcasts

| Event | Payload | Description |
|---|---|---|
| `participant-joined` | `{ participantId, displayName }` | Another peer entered the conference |
| `participant-left` | `{ participantId, displayName }` | A peer left the conference |
| `new-producer` | `{ producerId, participantId, displayName, kind, mediaType }` | New audio/video/screen stream available to consume |
| `producer-paused` | `{ producerId, participantId }` | Peer muted their audio or turned off video |
| `producer-resumed` | `{ producerId, participantId }` | Peer unmuted their audio or turned on video |
| `producer-closed` | `{ producerId, participantId }` | Peer stopped a media stream |
| `active-speaker` | `{ participantId, displayName, volume }` | Real-time dominant speaker detection |
| `chat-message` | `{ id, participantId, displayName, text, timestamp }` | Incoming group chat message |
| `hand-raised-updated` | `{ participantId, displayName, isHandRaised }` | Peer raised or lowered hand |
| `meeting-ended` | `{ roomId, reason, endedBy }` | The host ended the meeting; the room has been closed |
