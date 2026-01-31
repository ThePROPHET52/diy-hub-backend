# ProjectPro.AI Backend

Backend proxy service for ProjectPro.AI product recommendations using Anthropic's Claude API.

**Status**: 🚀 Deployed to Railway
**Live URL**: https://diy-hub-backend-production.up.railway.app
**Health Check**: https://diy-hub-backend-production.up.railway.app/api/health

## Overview

This Node.js/Express backend provides a secure proxy for the ProjectPro.AI mobile app to access Claude API for AI-powered product recommendations. It handles API key management, caching, rate limiting, and error handling.

## Features

- **Claude API Integration**: Uses Claude 3 Opus/Haiku for intelligent product recommendations
- **Caching**: In-memory caching with 7-day TTL (70%+ cache hit rate expected)
- **Rate Limiting**: 100 requests per hour per IP to control costs
- **Error Handling**: Graceful error handling with retry logic
- **Health Monitoring**: Health check and cache stats endpoints
- **Dual Endpoints**: Material enhancement + full project generation

## Prerequisites

- Node.js 20+
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- **API Tier**: Tier 1 or higher (Tier 1 uses Claude 3 Opus/Haiku)
- **Credits**: Minimum $5 recommended for testing

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
2. Create new project → "Deploy from GitHub repo"
3. Select your repository: `ThePROPHET52/diy-hub-backend`
4. Add environment variables in Railway dashboard:
   - `ANTHROPIC_API_KEY` (your sk-ant-api03-... key)
   - `NODE_ENV=production`
   - `PORT=3000`
5. Go to Settings → Networking → Generate Domain
6. Railway auto-deploys on push to main

**Production URL**: `https://diy-hub-backend-production.up.railway.app`

**Important**: After adding environment variables, you may need to manually redeploy (Deployments tab → ⋮ → Redeploy)

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

### Claude 3 Opus (Tier 1 - Higher Quality)
- **Material enhancement**: ~$0.015 per request (500 input + 300 output tokens)
- **Project generation**: ~$0.030 per request (500 input + 600 output tokens)
- **With caching**: 70% cache hit rate reduces costs by 70%
- **Monthly estimate** (1000 requests): ~$4.50
- **Hosting**: Free tier on Railway/Render

### Claude 3 Haiku (Tier 1 - Faster & Cheaper)
- **Material enhancement**: ~$0.001 per request (500 input + 300 output tokens)
- **Project generation**: ~$0.002 per request (500 input + 600 output tokens)
- **With caching**: 70% cache hit rate reduces costs by 70%
- **Monthly estimate** (1000 requests): ~$0.30
- **Hosting**: Free tier on Railway/Render

**Recommendation**: Start with Opus for quality, switch to Haiku if costs are a concern.

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

### "Model not found" (404 error)
- Check your API tier at https://console.anthropic.com/settings/plans
- **Tier 1**: Uses Claude 3 Opus or Claude 3 Haiku (configured in `services/claudeService.js`)
- **Tier 2+**: Can use Claude 3.5 Sonnet for better performance
- **Solution**: The backend automatically uses Tier 1 compatible models

### "Credit balance too low"
- Add credits at https://console.anthropic.com/settings/plans
- Minimum $5 recommended for testing

### "Rate limit exceeded"
- Wait 1 hour before making more requests
- Consider increasing `RATE_LIMIT_MAX` if needed

### "Cache not working"
- Check `CACHE_TTL_SECONDS` is set
- Verify cache stats at `/api/cache-stats`

### Railway deployment issues
- Ensure `trust proxy` is enabled in `server.js`
- Check environment variables are set in Railway dashboard
- View logs in Railway Deployments tab for specific errors

## Deployment Notes

### Current Configuration
- **Hosting**: Railway (https://railway.app)
- **Repository**: https://github.com/ThePROPHET52/diy-hub-backend
- **Model**: Claude 3 Opus (claude-3-opus-20240229) - Tier 1 compatible
- **Auto-deploy**: Enabled on push to main branch
- **Environment**: Production

### Quick Deploy Checklist
- [x] GitHub repository created
- [x] Railway project created and connected
- [x] Environment variables added to Railway
- [x] Public domain generated
- [x] Trust proxy enabled for Railway
- [ ] Health endpoint verified
- [ ] Test API endpoints with real requests
- [ ] Update frontend with production URL

### Model Selection
The backend is configured to use **Claude 3 Opus** which is available on Anthropic Tier 1.

**To switch to Claude 3 Haiku** (cheaper, faster):
1. Edit `services/claudeService.js`
2. Change `MODEL` to `'claude-3-haiku-20240307'`
3. Commit and push to trigger auto-deploy

**To upgrade to Claude 3.5 Sonnet** (requires Tier 2+):
1. Upgrade your Anthropic API tier at console.anthropic.com
2. Edit `services/claudeService.js`
3. Change `MODEL` to `'claude-3-5-sonnet-20241022'`
4. Commit and push to trigger auto-deploy

## License

MIT
