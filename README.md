# AI Decision Flow

A visual AI workflow builder using Next.js, React Flow, Inngest, OpenAI, and Shadcn/ui.

## Goal

Build editable AI decision nodes that return YES or NO and dynamically follow the corresponding workflow path.

## Tech Stack

- Next.js + TypeScript
- React Flow
- Inngest
- OpenAI SDK
- Shadcn/ui

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` and add:

```env
INNGEST_DEV=1
```

Start Next.js:

```bash
npm run dev
```

In a second terminal, start Inngest:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Frontend: http://localhost:3000

Inngest dashboard: http://localhost:8288

## Phase 1 Verification

- Next.js frontend running.
- Inngest connected successfully.
- `hello-world` function discovered.
- `test/hello` event executed successfully.