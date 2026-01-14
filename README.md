# DIY Hub Backend

Backend proxy service for DIY Hub AI product recommendations using Anthropic's Claude API.

## Overview

This Node.js/Express backend provides a secure proxy for the DIY Hub mobile app to access Claude API for AI-powered product recommendations. It handles API key management, caching, rate limiting, and error handling.

## Features

- **Claude API Integration**: Uses Claude 3.5 Sonnet for intelligent product recommendations
- **Caching**: In-memory caching with 7-day TTL (70%+ cache hit rate expected)
- **Rate Limiting**: 100 requests per hour per IP to control costs
- **Error Handling**: Graceful error handling with retry logic
- **Health Monitoring**: Health check and cache stats endpoints

## Prerequisites

- Node.js 20+
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

3. **Start the server**:
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### POST /api/enhance-material

Enhance a generic material with AI product recommendations.

**Request Body**:
```json
{
  "name": "Paint",
  "category": "Paint",
  "unit": "gallons",
  "quantity": 2,
  "specification": null,
  "projectContext": {
    "projectTitle": "Paint Living Room Walls",
    "projectCategory": "Painting"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendation": {
      "primaryBrand": "Behr Premium Plus",
      "primaryModel": "Ultra Pure White",
      "specification": "Interior flat paint, low-VOC",
      "reasoning": "Excellent coverage, low odor...",
      "alternatives": [...],
      "buyingTips": "One gallon covers ~400 sq ft...",
      "quantitySuggestion": "2 gallons appropriate..."
    }
  },
  "cached": false
}
```

### GET /api/health

Health check endpoint.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "diy-hub-backend"
}
```

### GET /api/cache-stats

Get cache statistics (for monitoring).

**Response**:
```json
{
  "success": true,
  "data": {
    "cacheStats": {
      "keys": 45,
      "hits": 120,
      "misses": 50,
      "ksize": 4500,
      "vsize": 90000
    }
  }
}
```

## Deployment

### Railway.app (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repo
4. Add environment variables in Railway dashboard:
   - `ANTHROPIC_API_KEY`
   - `NODE_ENV=production`
5. Railway auto-deploys on push to main

Your backend will be available at: `https://your-project.up.railway.app`

### Render.com

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Configure:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add environment variables
6. Deploy

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) | - |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `ALLOWED_ORIGINS` | CORS allowed origins | * |
| `RATE_LIMIT_MAX` | Max requests per window | 100 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | 3600000 (1 hour) |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds | 604800 (7 days) |

## Cost Estimation

- **Claude API**: ~$0.006 per request (500 input + 300 output tokens)
- **With caching**: 70% cache hit rate reduces API calls by 70%
- **Monthly estimate** (1000 requests): ~$1.80
- **Hosting**: Free tier on Railway/Render

## Project Structure

```
diy-hub-backend/
├── server.js              # Express app entry point
├── routes/
│   └── enhance.js         # API routes
├── services/
│   └── claudeService.js   # Claude API wrapper
├── middleware/
│   ├── rateLimiter.js     # Rate limiting
│   └── errorHandler.js    # Error handling
├── utils/
│   ├── promptBuilder.js   # Prompt construction
│   └── cache.js           # Caching logic
├── package.json
├── .env                   # Environment variables (not committed)
└── .env.example           # Example environment variables
```

## Testing

### Test with curl

```bash
# Health check
curl http://localhost:3000/api/health

# Enhance material
curl -X POST http://localhost:3000/api/enhance-material \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paint",
    "category": "Paint",
    "unit": "gallons",
    "quantity": 2,
    "projectContext": {
      "projectTitle": "Paint Living Room",
      "projectCategory": "Painting"
    }
  }'

# Cache stats
curl http://localhost:3000/api/cache-stats
```

## Monitoring

Check logs for:
- Request counts
- Cache hit/miss rates
- API errors
- Rate limit violations

Cache stats available at `/api/cache-stats` endpoint.

## Security

- API key stored in environment variables only
- Rate limiting prevents abuse
- CORS configured to restrict origins
- Input validation on all requests
- Generic error messages to users

## Troubleshooting

### "Invalid Anthropic API key"
- Check that `ANTHROPIC_API_KEY` is set in `.env`
- Verify key is valid at https://console.anthropic.com/

### "Rate limit exceeded"
- Wait 1 hour before making more requests
- Consider increasing `RATE_LIMIT_MAX` if needed

### "Cache not working"
- Check `CACHE_TTL_SECONDS` is set
- Verify cache stats at `/api/cache-stats`

## License

MIT
