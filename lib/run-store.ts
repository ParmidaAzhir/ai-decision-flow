
import fs from "node:fs";
import path from "node:path";

export type DecisionLog = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
};

export type RunStatus = {
  status: "queued" | "running" | "completed" | "failed";
  activeNodeId: string | null;
  logs: DecisionLog[];
  error?: string;
};

const folder = path.join(process.cwd(), ".local-runs");

export function saveRun(id: string, state: RunStatus) {
  fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(
    path.join(folder, `${id}.json`),
    JSON.stringify(state, null, 2)
  );
}

export function readRun(id: string): RunStatus | null {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;

  const file = path.join(folder, `${id}.json`);

  if (!fs.existsSync(file)) return null;

  return JSON.parse(fs.readFileSync(file, "utf8"));
}
