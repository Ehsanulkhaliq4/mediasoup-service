import express from "express";
import http from "http";
import cors from "cors";

import config from "./config/config.js";
import { createWorkerPool } from "./mediasoup/worker.js";
import roomManager from "./rooms/roomManager.js";
import participantManager from "./rooms/participantManager.js";
import transportManager from "./rooms/transportManager.js";
import producerManager from "./rooms/producerManager.js";
import consumerManager from "./rooms/consumerManager.js";

import { createRoomRoutes } from "./routes/roomRoutes.js";
import { createParticipantRoutes } from "./routes/participantRoutes.js";
import { createTransportRoutes } from "./routes/transportRoutes.js";
import { createProducerRoutes } from "./routes/producerRoutes.js";
import { createConsumerRoutes } from "./routes/consumerRoutes.js";
import { createStatsRoutes } from "./routes/statsRoutes.js";

import { initializeSignaling } from "./socket/signaling.js";

// A single stray promise (for example a worker rejecting "Producer not found"
// while media is being torn down) must never take down every active meeting.
// Log it and keep the SFU running; individual handlers already report errors
// back to the affected client.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection (ignored):", reason);
});

async function startServer() {
  // --------------------------------------------------
  // 1. Initialize mediasoup Worker Pool
  // --------------------------------------------------
  const workerPool = await createWorkerPool();

  // --------------------------------------------------
  // 2. Create Express App & HTTP Server
  // --------------------------------------------------
  const app = express();
  const server = http.createServer(app);

  app.use(cors(config.server.cors));
  app.use(express.json());

  // --------------------------------------------------
  // 3. Initialize Socket.IO Real-time Signaling
  // --------------------------------------------------
  const io = initializeSignaling(server, config.server.cors);

  // --------------------------------------------------
  // 4. Register HTTP REST API Routes
  // --------------------------------------------------
  app.use("/api/rooms", createRoomRoutes(roomManager, workerPool));
  app.use("/api", createParticipantRoutes(roomManager, participantManager));
  app.use("/api", createTransportRoutes(roomManager, transportManager));
  app.use("/api", createProducerRoutes(roomManager, producerManager));
  app.use("/api", createConsumerRoutes(roomManager, consumerManager));
  app.use("/api/stats", createStatsRoutes(roomManager, workerPool));

  // Health endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "UP",
      service: "mediasoup-conference-backend",
      timestamp: new Date().toISOString(),
      activeRooms: roomManager.getAllRooms().length,
    });
  });

  // Root endpoint info
  app.get("/", (req, res) => {
    res.json({
      service: "mediasoup-conference-backend",
      status: "UP",
      endpoints: {
        health: "/health",
        stats: "/api/stats",
        rooms: "/api/rooms",
      },
      documentation: "See API_DOCS.md for complete REST and Socket.IO specifications",
    });
  });

  // --------------------------------------------------
  // 5. Start Server
  // --------------------------------------------------
  const PORT = config.server.port;
  const HOST = config.server.host;

  server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
  server.on("error", (err) => {
    console.error("HTTP server failed to listen:", err.message);
    workerPool.close();
    process.exit(1);
  });

  // Graceful shutdown
  const handleShutdown = () => {
    server.close(() => {
      workerPool.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

