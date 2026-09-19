# InsightForge AI — Personalized Career Report

A production-style **Next.js AI application** that turns a short career profile into a structured career-growth report using the **Anthropic Claude API**.

**Live demo:** https://personalized-ai-report.vercel.app

## Why I built this

The goal was to build a small AI product that demonstrates more than a client-side model call. The app keeps provider credentials on the server, validates user input, handles provider failures, returns a predictable report structure, and still works locally without an API key through a deterministic fallback.

## What it demonstrates

- Server-side LLM integration with Anthropic Claude
- API-key isolation — provider credentials never reach the browser
- Input validation and length limits
- Provider timeout and error handling
- Structured prompt/output contract
- Responsive React UI
- Local fallback behavior for development/demo use
- Production deployment with Vercel

## Architecture

```text
User
  |
  v
Next.js / React UI
  |
  | POST /api/generate
  v
Server-side API route
  |
  +--> Validate + normalize input
  |
  +--> ANTHROPIC_API_KEY available?
          |
          +--> Yes --> Anthropic Messages API --> Parse text blocks
          |
          +--> No  --> Deterministic local fallback
  |
  v
Structured career report
  |
  v
React result view
```

## Request flow

The client collects six fields:

- name
- current role
- years of experience
- career goal
- strengths
- biggest challenge

The server route then:

1. validates the request body
2. trims and bounds user-provided text
3. validates the numeric experience range
4. builds a constrained prompt
5. calls Anthropic with a 25-second timeout
6. normalizes the returned text
7. returns a report containing:
   - Snapshot
   - Strongest Advantages
   - Gaps To Close
   - 30-Day Plan
   - Next Move

## Tech stack

- **Next.js 16**
- **React 19**
- **JavaScript**
- **Anthropic Messages API**
- **Vercel**

## Project structure

```text
app/
├── api/
│   └── generate/
│       └── route.js      # validation, prompt construction, Claude call
├── globals.css           # application styling
├── layout.js             # app layout/metadata
└── page.js               # form, API request, loading/error/result UI
```

## Run locally

```bash
git clone https://github.com/tejaswaroop999/personalized-ai-report.git
cd personalized-ai-report
npm install
cp .env.example .env.local
```

Add your Anthropic key:

```env
ANTHROPIC_API_KEY=your_key_here
```

Optional:

```env
CLAUDE_MODEL=claude-sonnet-4-6
```

Then run:

```bash
npm run dev
```

Open http://localhost:3000.

If `ANTHROPIC_API_KEY` is not configured, the app uses a local deterministic fallback so the full UI flow can still be tested.

## Reliability and security choices

### Server-side provider call

The Anthropic request is made only inside the Next.js server route. The browser never receives the API key.

### Input validation

Required fields are validated and trimmed. User-controlled text is bounded before being included in the model prompt.

### Timeout handling

The external model call uses a request timeout so the server does not wait indefinitely on the provider.

### Provider failure handling

Non-success provider responses and empty model outputs are converted into explicit API errors instead of silently failing.

## Current limitations

This is intentionally a focused project rather than a complete SaaS platform. It does not currently include:

- authentication
- persistent report history
- rate limiting
- billing
- queues/background jobs
- tracing or LLM observability
- automated model-output evaluation

## Production roadmap

If scaling this into a larger product, I would add:

1. authentication and user accounts
2. persistent report storage
3. rate limiting and abuse protection
4. structured-output validation
5. prompt/model versioning
6. request tracing and observability
7. evaluation datasets for report quality
8. queue-based processing for longer jobs
9. usage/cost tracking
10. automated tests for API and UI flows

## Interview talking points

This project is useful for discussing:

- why LLM provider calls belong on the server
- how to validate user-controlled prompt inputs
- prompt contracts vs structured-output schemas
- handling latency and provider failures
- what changes when AI traffic scales
- rate limiting, queues, persistence, and observability
- evaluating model output quality rather than only checking API success

## Author

**Teja Swaroop**  
Applied AI Engineer / Software Engineer

- LinkedIn: https://www.linkedin.com/in/tejaswaroop999/
- GitHub: https://github.com/tejaswaroop999
