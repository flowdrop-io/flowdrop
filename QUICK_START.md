# Quick Start Guide

Get FlowDrop UI running in production in 5 minutes.

## Option 1: Docker (Recommended)

```bash
# 1. Clone or download the repository
git clone https://github.com/d34dman/flowdrop.git
cd flowdrop

# 2. Copy environment file
cp env.example .env

# 3. Edit .env and set your backend API URL
nano .env
# Change: FLOWDROP_API_BASE_URL=http://your-backend-server:8080/api/flowdrop

# 4. Start with Docker Compose
docker-compose up -d

# 5. Open in browser
# http://localhost:3000
```

That's it! 🎉

## Option 2: Manual Deployment

```bash
# 1. Install dependencies
npm ci

# 2. Build the application
npm run build

# 3. Set environment variables
export FLOWDROP_API_BASE_URL=http://your-backend:8080/api/flowdrop
export NODE_ENV=production
export PORT=3000

# 4. Start the server
node build

# 5. Open in browser
# http://localhost:3000
```

## Option 3: Development Mode

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp env.example .env

# 3. Set development variables
export VITE_API_BASE_URL=http://localhost:8080/api/flowdrop

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:5173
```

## Environment Variables

**Required:**

- `FLOWDROP_API_BASE_URL` - Your FlowDrop backend API URL

**Optional:**

- `PORT` - Server port - Default: 3000

## Verify Installation

Check the configuration endpoint:

```bash
curl http://localhost:3000/api/config
```

You should see:

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

## Troubleshooting

### Can't connect to backend

Make sure the backend URL is accessible:

```bash
curl http://your-backend:8080/api/flowdrop/nodes
```

### Port already in use

Change the port:

```bash
export PORT=3001
# or in docker-compose.yml:
ports:
  - "3001:3000"
```

### Docker issues

Check logs:

```bash
docker logs flowdrop-ui
```

## Next Steps

- Read [DOCKER.md](./DOCKER.md) for Docker details

## Support

- GitHub: https://github.com/d34dman/flowdrop
- Issues: https://github.com/d34dman/flowdrop/issues
