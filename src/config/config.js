import os from "os";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  // HTTP server settings
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  },

  // mediasoup settings
  mediasoup: {
    // Number of workers to spawn (default: number of CPU cores, capped at 4 for standard machines)
    numWorkers: parseInt(
      process.env.MEDIASOUP_NUM_WORKERS || Math.min(os.cpus().length, 4).toString(),
      10
    ),

    workerSettings: {
      logLevel: process.env.MEDIASOUP_LOG_LEVEL || "warn",
      logTags: [
        "info",
        "ice",
        "dtls",
        "rtp",
        "srtp",
        "rtcp",
      ],
      rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT || "40000", 10),
      rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || "49999", 10),
    },

    // Router media codecs (supports Opus audio, VP8 and H264 video for broad browser compatibility)
    routerMediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
          "x-google-start-bitrate": 1000,
        },
      },
      {
        kind: "video",
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "42e01f",
          "level-asymmetry-allowed": 1,
          "x-google-start-bitrate": 1000,
        },
      },
    ],

    // WebRTC Transport settings
    webRtcTransport: {
      listenInfos: [
        {
          protocol: "udp",
          ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1",
          portRange: {
            min: parseInt(process.env.MEDIASOUP_MIN_PORT || "40000", 10),
            max: parseInt(process.env.MEDIASOUP_MAX_PORT || "49999", 10),
          },
        },
        {
          protocol: "tcp",
          ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1",
          portRange: {
            min: parseInt(process.env.MEDIASOUP_MIN_PORT || "40000", 10),
            max: parseInt(process.env.MEDIASOUP_MAX_PORT || "49999", 10),
          },
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      maxSctpMessageSize: 262144,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    },
  },
};

export default config;
