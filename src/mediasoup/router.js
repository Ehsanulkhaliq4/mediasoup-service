import config from "../config/config.js";

/**
 * Creates a mediasoup Router on the specified worker
 * @param {import('mediasoup').types.Worker} worker
 * @returns {Promise<import('mediasoup').types.Router>}
 */
export async function createRouter(worker) {
  const router = await worker.createRouter({
    mediaCodecs: config.mediasoup.routerMediaCodecs,
  });

  return router;
}

/**
 * Creates an AudioLevelObserver for active speaker detection
 * @param {import('mediasoup').types.Router} router
 * @returns {Promise<import('mediasoup').types.AudioLevelObserver>}
 */
export async function createAudioObserver(router) {
  const audioLevelObserver = await router.createAudioLevelObserver({
    maxEntries: 1,
    threshold: -60,
    interval: 800,
  });

  return audioLevelObserver;
}