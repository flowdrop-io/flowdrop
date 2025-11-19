# Docker Quick Start Guide

This guide provides quick instructions for running FlowDrop UI with Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` and update the FlowDrop backend API URL:

```bash
FLOWDROP_API_BASE_URL=http://your-backend-server:8080/api/flowdrop
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

### 3. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

## Docker Commands

### Build the image

```bash
docker build -t flowdrop-ui:latest .
```

### Run the container

```bash
docker run -d \
  --name flowdrop-ui \
  -p 3000:3000 \
  -e FLOWDROP_API_BASE_URL=http://your-backend:8080/api/flowdrop \
  flowdrop-ui:latest
```

### View logs

```bash
docker logs -f flowdrop-ui
```

### Stop the container

```bash
docker-compose down
```

### Restart the container

```bash
docker-compose restart
```

## Environment Variables

Key environment variables you can configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `FLOWDROP_API_BASE_URL` | Backend API URL | `/api/flowdrop` |
| `FLOWDROP_THEME` | UI theme (light/dark/auto) | `auto` |
| `PORT` | Server port | `3000` |

See `env.example` for all available options.

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs flowdrop-ui
```

### Can't connect to backend

Verify the API URL is accessible from within the container:
```bash
docker exec flowdrop-ui wget -qO- http://your-backend:8080/api/flowdrop/nodes
```

### Port already in use

Change the external port in docker-compose.yml:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

## Health Check

Verify the application is running:

```bash
curl http://localhost:3000/api/config
```

Expected response:
```json
{
  "apiBaseUrl": "http://your-backend:8080/api/flowdrop",
  "theme": "auto",
  "timeout": 30000,
  "authType": "none",
  "version": "1.0.0",
  "environment": "production"
}
```

## Production Deployment

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

