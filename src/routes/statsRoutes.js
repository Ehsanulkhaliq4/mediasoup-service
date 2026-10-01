import express from "express";
import os from "os";

export function createStatsRoutes(roomManager, workerPool) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const rooms = roomManager.getAllRooms();
      let totalParticipants = 0;
      let totalProducers = 0;

      for (const r of rooms) {
        totalParticipants += r.participantCount;
        totalProducers += r.producerCount;
      }

      const workers = workerPool ? workerPool.getWorkers() : [];
      const workerStats = [];

      for (const w of workers) {
        try {
          const usage = await w.getResourceUsage();
          workerStats.push({
            pid: w.pid,
            closed: w.closed,
            resourceUsage: usage,
          });
        } catch (_) {
          workerStats.push({
            pid: w.pid,
            closed: w.closed,
          });
        }
      }

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
          totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
          freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
          cpuCores: os.cpus().length,
          processMemoryMB: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          },
        },
        conference: {
          activeRooms: rooms.length,
          totalParticipants,
          totalProducers,
          workersCount: workers.length,
          workers: workerStats,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
