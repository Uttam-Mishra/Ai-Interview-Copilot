# AI Interview Copilot

This repo contains a minimal full-stack foundation for the hackathon app:

- `frontend/`: React + Vite UI shell
- `backend/`: Node API for resume parsing, question generation, and answer evaluation
- frontend API proxy to the backend during local development

## Run locally

1. Install dependencies from the project root:

```bash
npm install
```

2. Start the backend:

```bash
npm run dev:backend
```

3. In a second terminal, start the frontend:

```bash
npm run dev:frontend
```

The frontend will call `GET /api/health` and show the backend status on load.

## Production build

This repo can now run as a single deployable service:

```bash
npm install
npm run build
npm run start
```

In production, the backend serves the built frontend from `frontend/dist`, so you can deploy one service and attach one domain.

## Deploy for a `.com`

The simplest hackathon path is a single web service on Render:

1. Push this repo to GitHub.
2. Create a new Render Web Service from the repo.
3. Use the settings already captured in [render.yaml](/Users/uttammishra/Desktop/Hack%20India%202026/render.yaml).
4. Add `OPENAI_API_KEY` in Render when you are ready.
5. After deploy, connect your custom domain in the Render dashboard.

Until you buy a `.com`, the app can still run on the default `onrender.com` subdomain.
