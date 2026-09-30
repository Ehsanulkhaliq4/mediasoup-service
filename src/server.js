import express from "express";
import { createWorker } from "./mediasoup/worker.js";
import roomManager from "./rooms/roomManager.js";
import participantManager from "./rooms/participantManager.js";
import transportManager from "./rooms/transportManager.js";

import { createRoomRoutes } from "./routes/roomRoutes.js";
import { createParticipantRoutes } from "./routes/participantRoutes.js";

import { createTransportRoutes } from "./routes/transportRoutes.js";

async function startServer() {
  // --------------------------------------------------
  // 1. Create mediasoup Worker
  // --------------------------------------------------

  const worker = await createWorker();

  console.log("mediasoup Worker is ready");

  // --------------------------------------------------
  // 2. Create Express application
  // --------------------------------------------------

  const app = express();

  app.use(express.json());

  // --------------------------------------------------
  // 3. Register HTTP routes
  // --------------------------------------------------

  app.use("/api/rooms", createRoomRoutes(roomManager, worker));

  app.use("/api", createParticipantRoutes(roomManager, participantManager));

  app.use("/api", createTransportRoutes(roomManager, transportManager));

  // --------------------------------------------------
  // 4. Health endpoint
  // --------------------------------------------------

  app.get("/health", (req, res) => {
    res.json({
      status: "UP",
      service: "mediasoup-service",
    });
  });

  // --------------------------------------------------
  // 5. Start HTTP server
  // --------------------------------------------------

  const PORT = 3000;

  app.listen(PORT, () => {
    console.log(`mediasoup HTTP service running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
