import mediasoup from "mediasoup";
import config from "../config/config.js";

class WorkerPool {
  constructor() {
    this.workers = [];
    this.nextWorkerIdx = 0;
  }

  async init() {
    const { numWorkers, workerSettings } = config.mediasoup;

    for (let i = 0; i < numWorkers; i++) {
      await this._createWorker(i, workerSettings);
    }

    return this;
  }

  async _createWorker(index, settings) {
    try {
      const worker = await mediasoup.createWorker({
        logLevel: settings.logLevel,
        logTags: settings.logTags,
        rtcMinPort: settings.rtcMinPort,
        rtcMaxPort: settings.rtcMaxPort,
        disableLiburing: true,
      });

      worker.on("died", () => {
        this.workers = this.workers.filter((w) => w.pid !== worker.pid);
        setTimeout(async () => {
          try {
            await this._createWorker(index, settings);
          } catch (_) {}
        }, 1500);
      });

      this.workers.push(worker);
      return worker;
    } catch (err) {
      throw err;
    }
  }

  getNextWorker() {
    if (this.workers.length === 0) {
      throw new Error("No mediasoup workers available in the pool");
    }
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  getWorkers() {
    return this.workers;
  }

  close() {
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
  }
}

const workerPool = new WorkerPool();

export async function createWorkerPool() {
  return await workerPool.init();
}

export function getMediasoupWorker() {
  return workerPool.getNextWorker();
}

export default workerPool;