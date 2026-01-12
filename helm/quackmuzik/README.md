# QuackMuzik Helm Chart

Helm chart for deploying QuackMuzik Discord music bot on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Docker images for bot and yt-cipher (or use image registry)

## Installation

### 1. Build Docker Images

First, build and push the Docker images:

```bash
# Build bot image
docker build -t your-registry/quackmuzik-bot:latest .

# Build yt-cipher image (if not using pre-built)
cd yt-cipher
docker build -t your-registry/quackmuzik-yt-cipher:latest .
cd ..
```

### 2. Create Secrets

Create a secrets file `secrets.yaml`:

```yaml
secrets:
  # Required secrets
  discordToken: "YOUR_DISCORD_BOT_TOKEN"
  discordClientId: "YOUR_DISCORD_CLIENT_ID"
  lavalinkServerPassword: "YOUR_SECURE_PASSWORD"  # Required - Lavalink server password

  # Optional music platform credentials
  spotifyClientId: "YOUR_SPOTIFY_CLIENT_ID"
  spotifyClientSecret: "YOUR_SPOTIFY_CLIENT_SECRET"
  appleMusicApiToken: "YOUR_APPLE_MUSIC_TOKEN"
  deezerMasterKey: "YOUR_DEEZER_KEY"
  yandexMusicToken: "YOUR_YANDEX_TOKEN"
  vkUserToken: "YOUR_VK_TOKEN"
  tidalToken: "YOUR_TIDAL_TOKEN"
  tidalRefreshToken: "YOUR_TIDAL_REFRESH_TOKEN"
  qobuzOauthToken: "YOUR_QOBUZ_TOKEN"
  qobuzAppId: "YOUR_QOBUZ_APP_ID"
  youtubeOauthRefreshToken: "YOUR_YOUTUBE_OAUTH_TOKEN"

  # Optional monitoring/database
  sentryDsn: "YOUR_SENTRY_DSN"
  databasePassword: "YOUR_DATABASE_PASSWORD"
```

Or use `--set` flags:

```bash
helm install quackmuzik ./helm/quackmuzik \
  --set secrets.discordToken="YOUR_TOKEN" \
  --set secrets.discordClientId="YOUR_CLIENT_ID" \
  --set secrets.lavalinkServerPassword="YOUR_SECURE_PASSWORD"
```

**Important:** All sensitive data (passwords, tokens, API keys) should be stored in Kubernetes Secrets, not in values.yaml. The chart will automatically create a Secret resource from the values provided via `--set` or `-f secrets.yaml`.

### 3. Install Chart

```bash
# Install with default values
helm install quackmuzik ./helm/quackmuzik

# Install with custom values
helm install quackmuzik ./helm/quackmuzik -f my-values.yaml

# Install with secrets
helm install quackmuzik ./helm/quackmuzik -f secrets.yaml
```

## Configuration

### Secrets Management

**All sensitive data should be stored in Kubernetes Secrets**, not in values.yaml. The chart automatically creates a Secret resource from the values provided.

**Required Secrets:**
- `secrets.discordToken` - Discord bot token
- `secrets.discordClientId` - Discord client ID
- `secrets.lavalinkServerPassword` - Lavalink server password (required for healthchecks)

**Optional Secrets:**
- Music platform credentials (Spotify, Apple Music, Deezer, etc.)
- Database password
- Sentry DSN
- YouTube OAuth refresh token
- Proxy credentials

**Best Practice:** Use external secret management tools like:
- [External Secrets Operator](https://external-secrets.io/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [HashiCorp Vault](https://www.vaultproject.io/)
- Kubernetes native secrets (for development only)

### Values File

Key configuration options in `values.yaml`:

- **Bot settings**: Image, resources, environment variables
- **Lavalink settings**: Image, resources, Java options, persistence
- **yt-cipher settings**: Image, resources, thread configuration
- **Secrets**: Discord tokens, music platform credentials
- **Image Pull Secrets**: For private container registries

### Image Pull Secrets

For private registries (like GitHub Container Registry), you need to configure image pull secrets.

**Option 1: Auto-create from credentials (Recommended)**

```yaml
global:
  imagePullSecret:
    create: true
    registry: 'ghcr.io'
    # Use secrets for production
    # username and password will be read from secrets if provided
```

```bash
helm install quackmuzik ./helm/quackmuzik \
  --set global.imagePullSecret.create=true \
  --set global.imagePullSecret.registry='ghcr.io' \
  --set secrets.imagePullSecretUsername='your-username' \
  --set secrets.imagePullSecretPassword='your-token'
```

**Option 2: Use existing secret**

```yaml
global:
  imagePullSecret:
    create: false
    existingSecret: 'my-registry-secret'
```

**Option 3: Manual imagePullSecrets**

```yaml
global:
  imagePullSecrets:
    - name: my-registry-secret
```

### Custom Values Example

```yaml
bot:
  image:
    repository: your-registry/quackmuzik-bot
    tag: v1.0.0
  resources:
    limits:
      memory: 1Gi
      cpu: 1000m

lavalink:
  resources:
    limits:
      memory: 2Gi
      cpu: 2000m
  persistence:
    enabled: true
    size: 20Gi
    storageClass: fast-ssd

ytCipher:
  env:
    MAX_THREADS: "4"
```

## Upgrading

```bash
# Upgrade with new values
helm upgrade quackmuzik ./helm/quackmuzik -f new-values.yaml

# Upgrade with new image tag
helm upgrade quackmuzik ./helm/quackmuzik \
  --set bot.image.tag=v1.1.0
```

## Uninstalling

```bash
helm uninstall quackmuzik
```

## Proxy Configuration

The chart supports routing network traffic through HTTP, HTTPS, or SOCKS proxies. This is useful for:
- Corporate network environments
- Geo-restricted regions
- Security requirements
- Network routing needs

### Enable Proxy

Edit `values.yaml` or use `--set` flags:

```yaml
proxy:
  enabled: true
  httpProxy: 'http://proxy.example.com:8080'
  httpsProxy: 'http://proxy.example.com:8080'
  socksProxy: ''  # Optional: socks5://proxy.example.com:1080
  noProxy: 'localhost,127.0.0.1,.svc,.svc.cluster.local,10.0.0.0/8'
  username: ''  # Optional: proxy authentication
  password: ''  # Optional: proxy authentication
```

### Install with Proxy

```bash
helm install quackmuzik ./helm/quackmuzik \
  --set proxy.enabled=true \
  --set proxy.httpProxy='http://proxy.example.com:8080' \
  --set proxy.httpsProxy='http://proxy.example.com:8080' \
  --set proxy.noProxy='localhost,127.0.0.1,.svc,.svc.cluster.local'
```

### Proxy with Authentication

**Option 1: Using Secrets (Recommended for Production)**

```bash
helm install quackmuzik ./helm/quackmuzik \
  --set proxy.enabled=true \
  --set proxy.httpProxy='http://proxy.example.com:8080' \
  --set proxy.httpsProxy='http://proxy.example.com:8080' \
  --set secrets.proxyUsername='proxyuser' \
  --set secrets.proxyPassword='proxypass'
```

**Option 2: Using Values (For Development Only)**

```bash
helm install quackmuzik ./helm/quackmuzik \
  --set proxy.enabled=true \
  --set proxy.httpProxy='http://proxy.example.com:8080' \
  --set proxy.httpsProxy='http://proxy.example.com:8080' \
  --set proxy.username='proxyuser' \
  --set proxy.password='proxypass'
```

**Note:** Secrets take priority over values. If both are set, secrets will be used.

### SOCKS Proxy

```bash
helm install quackmuzik ./helm/quackmuzik \
  --set proxy.enabled=true \
  --set proxy.socksProxy='socks5://proxy.example.com:1080'
```

**Note:** The `noProxy` setting excludes internal Kubernetes services and localhost from using the proxy. Adjust as needed for your environment.

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=quackmuzik
```

### View Logs

```bash
# Bot logs
kubectl logs -l app.kubernetes.io/component=bot

# Lavalink logs
kubectl logs -l app.kubernetes.io/component=lavalink

# yt-cipher logs
kubectl logs -l app.kubernetes.io/component=yt-cipher
```

### Check Services

```bash
kubectl get svc -l app.kubernetes.io/name=quackmuzik
```

### Debug Issues

```bash
# Describe pod
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check ConfigMap
kubectl get configmap quackmuzik-lavalink-config -o yaml

# Check Secrets (base64 encoded)
kubectl get secret quackmuzik-secrets -o yaml
```

## Production Considerations

1. **Use external secret management** (e.g., Sealed Secrets, External Secrets Operator) instead of Helm secrets
2. **Enable persistence** for Lavalink logs
3. **Set appropriate resource limits** based on your workload
4. **Use image pull secrets** for private registries
5. **Configure node selectors/affinity** for optimal placement
6. **Set up monitoring** (Prometheus metrics available)
7. **Configure backup** for persistent volumes

## Values Reference

See `values.yaml` for all available configuration options.

