FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN MEDIASOUP_SKIP_WORKER_PREBUILT_DOWNLOAD="true" npm install
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]