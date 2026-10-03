
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { readRun, saveRun } from "@/lib/run-store";

export const runtime = "nodejs";

type WorkflowNode = {
  id: string;
  data: { prompt: string };
};

type WorkflowEdge = {
  source: string;
  target: string;
  sourceHandle: string | null;
};

// Start a workflow
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      input?: string;
      nodes?: WorkflowNode[];
      edges?: WorkflowEdge[];
    };

    const { input, nodes, edges } = body;

    if (
      typeof input !== "string" ||
      !input.trim() ||
      input.length > 5000 ||
      !Array.isArray(nodes) ||
      nodes.length < 1 ||
      nodes.length > 30 ||
      !Array.isArray(edges) ||
      edges.length > 60
    ) {
      return NextResponse.json(
        { error: "Provide valid input and 1–30 decision nodes." },
        { status: 400 }
      );
    }

    const validNodes = nodes.every(
      (node) =>
        typeof node.id === "string" &&
        typeof node.data?.prompt === "string" &&
        node.data.prompt.trim().length > 0 &&
        node.data.prompt.length <= 1000
    );

    const ids = new Set(nodes.map((node) => node.id));

    const validEdges = edges.every(
      (edge) =>
        ids.has(edge.source) &&
        ids.has(edge.target) &&
        edge.source !== edge.target &&
        (edge.sourceHandle === "yes" ||
          edge.sourceHandle === "no")
    );

    const uniqueBranches = new Set(
      edges.map(
        (edge) => `${edge.source}:${edge.sourceHandle}`
      )
    );

    if (
      !validNodes ||
      ids.size !== nodes.length ||
      !validEdges ||
      uniqueBranches.size !== edges.length
    ) {
      return NextResponse.json(
        { error: "Invalid workflow nodes or connections." },
        { status: 400 }
      );
    }

    const runId = randomUUID();

    saveRun(runId, {
      status: "queued",
      activeNodeId: null,
      logs: [],
    });

    await inngest.send({
      name: "workflow/run",
      data: { runId, input, nodes, edges },
    });

    return NextResponse.json({ runId }, { status: 202 });
  } catch (error) {
    console.error("Workflow start failed:", error);

    return NextResponse.json(
      { error: "Could not start the workflow." },
      { status: 500 }
    );
  }
}

// Retrieve workflow progress
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  const result = id ? readRun(id) : null;

  if (!result) {
    return NextResponse.json(
      { error: "Run not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
