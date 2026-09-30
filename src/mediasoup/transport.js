export async function createWebRtcTransport(router) {
    

    const transport = await router.createWebRtcTransport({
        listenInfos: [
            {
                protocol: "udp",
                ip: "127.0.0.1",
                announcedAddress: "127.0.0.1"
            },{
                protocol: "tcp",
                ip: "127.0.0.1",
                announcedAddress: "127.0.0.1"
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
    });

    console.log("WebRTC Transport created successfully");
    console.log("Transport ID:", transport.id);
    return transport;
}