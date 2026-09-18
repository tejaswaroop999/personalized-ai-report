# InsightForge AI — Personalized Career Report

A small production-style Next.js app that turns a short career profile into a personalized growth report using Anthropic Claude.

## What it demonstrates

- Next.js / React full-stack development
- Server-side API integration with Claude
- API-key isolation (the key never reaches the browser)
- Input validation and provider error handling
- Responsive UI
- Graceful local fallback when no API key is configured

## Run locally

```bash
npm install
cp .env.example .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

Open http://localhost:3000.

Live demo: https://personalized-ai-report.vercel.app

## Deploy to Vercel

1. Push this folder to a public GitHub repository.
2. Import the repository into Vercel.
3. Add `ANTHROPIC_API_KEY` in Project Settings → Environment Variables.
4. Deploy.

`CLAUDE_MODEL` is optional and defaults to `claude-sonnet-4-6`.

## Architecture

Browser form → `POST /api/generate` → validation → Anthropic Messages API → formatted report → browser.

The Anthropic key is only read inside the server route. The browser never receives it.

## Interview talking points

- Why the provider call belongs on the server instead of the client.
- How validation limits malformed/oversized requests.
- Why external AI calls need explicit failure handling.
- How you would add rate limiting, persistence, auth, observability and queues if usage increased.
