import config from "../config/config.js";

export async function createWebRtcTransport(router) {
  const { webRtcTransport } = config.mediasoup;

  const transport = await router.createWebRtcTransport({
    listenInfos: webRtcTransport.listenInfos,
    initialAvailableOutgoingBitrate: webRtcTransport.initialAvailableOutgoingBitrate,
    maxSctpMessageSize: webRtcTransport.maxSctpMessageSize,
    enableUdp: webRtcTransport.enableUdp,
    enableTcp: webRtcTransport.enableTcp,
    preferUdp: webRtcTransport.preferUdp,
  });

  transport.on("dtlsstatechange", (dtlsState) => {
    if (dtlsState === "closed") {
      transport.close();
    }
  });

  return transport;
}