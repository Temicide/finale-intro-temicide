# finale-intro-temicide-frontend

## Project Structure

- backend/: Express API (ESM)
- frontend/: Static site + tiny Express dev server (ESM)

## Setup

1. Install dependencies in both apps

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure backend environment

Create `backend/.env` (see `.env.example`).

```env
PORT=3222
MONGO_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_api_key
```

3. Run servers (separate)

- Backend: `cd backend && npm start` (http://localhost:3222)
- Frontend: `cd frontend && npm start` (http://localhost:3221)

Frontend calls backend at `http://localhost:3222/api`.

## Notes

- No script CDNs. Only CSS CDN allowed, but fonts CDN removed for portability.
- PM2 config (`ecosystem.config.js`) contains no secrets; use `.env` instead.