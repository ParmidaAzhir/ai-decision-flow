# AI Decision Flow — BE-09

A visual AI workflow builder using Next.js, React Flow, Inngest, OpenAI SDK, and Shadcn/ui.

Users can create editable decision nodes, connect them through YES/NO branches, and execute workflows while tracking their progress visually.

## Tech Stack

- Next.js + TypeScript
- React Flow (`@xyflow/react`)
- Inngest
- OpenAI SDK
- Shadcn/ui
- Tailwind CSS

## Features

- Interactive React Flow editor
- Add and connect decision nodes
- Editable node prompts
- YES/NO branching
- Automatic local graph saving
- Inngest workflow execution
- OpenAI integration with structured YES/NO responses
- Free mock mode for development
- Visual execution states
- Execution logs
- Animated selected edges

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root.

For free mock testing:

```env
INNGEST_DEV=1
MOCK_AI=true
```

For real OpenAI execution:

```env
INNGEST_DEV=1
MOCK_AI=false
OPENAI_API_KEY=your_api_key_here
```

Real OpenAI execution requires an API key with available credits.

Never commit `.env.local` to GitHub.

### 3. Start the frontend

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Start Inngest

In a second terminal:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Open http://localhost:8288.

## How It Works

1. Create decision nodes.
2. Edit each node's question.
3. Connect nodes using YES and NO handles.
4. Enter a user message.
5. Click Run Workflow.
6. Inngest executes each visited decision as a separate step.
7. The system produces a YES or NO answer.
8. Execution follows the matching edge until no further connection exists.

## Example Workflow

Input:

"My account is locked and I cannot log in. Please help me."

Expected mock execution:

```text
Is this a support request?
→ YES

Is this related to a login problem?
→ YES

Workflow completed.
```

## API Endpoints

| Endpoint | Purpose |
|---|---|
| GET /api/inngest | Inngest integration endpoint |
| POST /api/run | Start a workflow |
| GET /api/run?id=RUN_ID | Retrieve execution progress |

## Phase 4 Improvements

Implemented:

- Visual execution state (active and completed nodes)
- Execution logs panel
- Automatic local workflow saving/loading
- Better node styling
- Animated selected edges

## Testing

Run the TypeScript check:

```bash
npx tsc --noEmit
```

Mock Mode has been tested with YES and NO branching, execution logs, and completed workflow status.

Real OpenAI execution is implemented but has not yet been successfully verified because the API account had no available credits.

Mock Mode is intended for development and does not replace real LLM-based execution.