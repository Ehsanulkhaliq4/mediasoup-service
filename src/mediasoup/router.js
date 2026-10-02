import config from "../config/config.js";

export async function createRouter(worker) {
  const router = await worker.createRouter({
    mediaCodecs: config.mediasoup.routerMediaCodecs,
  });

  return router;
}

export async function createAudioObserver(router) {
  const audioLevelObserver = await router.createAudioLevelObserver({
    maxEntries: 1,
    threshold: -60,
    interval: 800,
  });

  return audioLevelObserver;
}