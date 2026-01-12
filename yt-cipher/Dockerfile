# Dockerfile for yt-cipher
# Based on https://github.com/kikkia/yt-cipher

FROM denoland/deno:alpine-2.1.4

WORKDIR /app

# Clone yt-cipher and ejs dependency
RUN apk add --no-cache git && \
    git clone https://github.com/kikkia/yt-cipher.git . && \
    git clone https://github.com/yt-dlp/ejs.git && \
    cd ejs && \
    git checkout 25b77b73108ae08451fb06b98a787712c06298a5 && \
    cd .. && \
    deno run --allow-read --allow-write ./scripts/patch-ejs.ts && \
    deno cache server.ts worker.ts && \
    apk del git

# Expose port
EXPOSE 8001

# Set environment variables
ENV PORT=8001
ENV HOST=0.0.0.0
ENV MAX_THREADS=2

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --spider -q http://localhost:8001/ || exit 1

# Run server
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "server.ts"]

