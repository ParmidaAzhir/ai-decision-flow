
"use client";

import { useEffect, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

type DecisionData = {
  prompt: string;
  execution?: "active" | "completed" | "idle";
};

type DecisionNodeType = Node<DecisionData, "decision">;

type DecisionLog = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
};

type RunState = {
  status: "queued" | "running" | "completed" | "failed";
  activeNodeId: string | null;
  logs: DecisionLog[];
  error?: string;
};

function DecisionNode({ data }: NodeProps<DecisionNodeType>) {
  const border =
    data.execution === "active"
      ? "border-amber-500 ring-4 ring-amber-200"
      : data.execution === "completed"
        ? "border-green-500 ring-4 ring-green-200"
        : "border-slate-300";

  return (
    <div
      className={`relative min-w-56 max-w-64 rounded-xl border-2 bg-white p-4 text-slate-900 shadow-md ${border}`}
    >
      <Handle type="target" position={Position.Top} />

      <p className="mb-2 text-xs font-bold uppercase text-slate-500">
        AI Decision
      </p>

      <p className="mb-6 text-sm font-medium">
        {data.prompt || "Click to edit this question"}
      </p>

      <div className="flex justify-around text-xs font-bold">
        <span className="text-green-600">YES</span>
        <span className="text-red-600">NO</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "25%", background: "#16a34a" }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "75%", background: "#dc2626" }}
      />
    </div>
  );
}

const nodeTypes = {
  decision: DecisionNode,
};

export default function Home() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<DecisionNodeType>([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [workflowInput, setWorkflowInput] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [runError, setRunError] = useState("");
  const [starting, setStarting] = useState(false);

  // Load the saved graph
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-decision-flow");

      if (saved) {
        const graph = JSON.parse(saved);
        setNodes(graph.nodes ?? []);
        setEdges(graph.edges ?? []);
      }
    } catch (error) {
      console.error("Could not load workflow:", error);
    }

    setLoaded(true);
  }, [setNodes, setEdges]);

  // Automatically save graph changes
  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      "ai-decision-flow",
      JSON.stringify({ nodes, edges })
    );
  }, [nodes, edges, loaded]);

  // Check workflow execution every second
  useEffect(() => {
    if (!runId) return;

    if (
      runState?.status === "completed" ||
      runState?.status === "failed"
    ) {
      return;
    }

    let cancelled = false;

    const checkProgress = async () => {
      try {
        const response = await fetch(
          `/api/run?id=${encodeURIComponent(runId)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Could not retrieve workflow progress.");
        }

        const result: RunState = await response.json();

        if (!cancelled) {
          setRunState(result);
          setRunError("");
        }
      } catch (error) {
        if (!cancelled) {
          setRunError(
            error instanceof Error
              ? error.message
              : "Could not check execution."
          );
        }
      }
    };

    void checkProgress();

    const timer = window.setInterval(() => {
      void checkProgress();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [runId, runState?.status]);

  const isRunning =
    starting ||
    runState?.status === "queued" ||
    runState?.status === "running";

  // Add decision node
  const addNode = () => {
    setNodes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "decision",
        position: {
          x: 100 + current.length * 60,
          y: 100 + current.length * 100,
        },
        data: {
          prompt: "New decision question?",
        },
      },
    ]);
  };

  // Connect nodes using YES or NO
  const onConnect = (connection: Connection) => {
    const answer = connection.sourceHandle?.toUpperCase();

    if (answer !== "YES" && answer !== "NO") return;
    if (connection.source === connection.target) return;

    setEdges((current) => {
      const remaining = current.filter(
        (edge) =>
          !(
            edge.source === connection.source &&
            edge.sourceHandle === connection.sourceHandle
          )
      );

      return addEdge(
        {
          ...connection,
          type: "smoothstep",
          label: answer,
          style: {
            stroke: answer === "YES" ? "#16a34a" : "#dc2626",
            strokeWidth: 2,
          },
        },
        remaining
      );
    });
  };

  const selectedNode = nodes.find(
    (node) => node.id === selectedId
  );

  const updatePrompt = (prompt: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? {
              ...node,
              data: { ...node.data, prompt },
            }
          : node
      )
    );
  };

  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setRunId(null);
    setRunState(null);
    setRunError("");
  };

  // Trigger our Inngest workflow
  const startWorkflow = async () => {
    if (!workflowInput.trim() || nodes.length === 0) {
      setRunError("Add a decision node and enter some input first.");
      return;
    }

    setStarting(true);
    setRunId(null);
    setRunState(null);
    setRunError("");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: workflowInput,
          nodes: nodes.map((node) => ({
            id: node.id,
            data: { prompt: node.data.prompt },
          })),
          edges: edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Workflow could not start.");
      }

      setRunId(result.runId);

      setRunState({
        status: "queued",
        activeNodeId: null,
        logs: [],
      });
    } catch (error) {
      setRunError(
        error instanceof Error ? error.message : "Unknown error."
      );
    } finally {
      setStarting(false);
    }
  };

  // Highlight active/completed nodes
  const displayedNodes = nodes.map((node) => {
    const active =
      runState?.status === "running" &&
      runState.activeNodeId === node.id;

    const completed = runState?.logs.some(
      (log) => log.nodeId === node.id
    );

    return {
      ...node,
      data: {
        ...node.data,
        execution: active
          ? ("active" as const)
          : completed
            ? ("completed" as const)
            : ("idle" as const),
      },
    };
  });

  // Animate the YES/NO branches that were followed
  const displayedEdges = edges.map((edge) => ({
    ...edge,
    animated:
      runState?.logs.some(
        (log) =>
          log.nodeId === edge.source &&
          log.answer === edge.sourceHandle?.toUpperCase()
      ) ?? false,
  }));

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              AI Decision Flow
            </h1>

            <p className="mt-2 text-slate-500">
              Build and execute visual YES/NO AI workflows
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addNode}
              disabled={isRunning}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              + Add Decision
            </button>

            <button
              onClick={clearWorkflow}
              disabled={isRunning}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

          {/* Visual editor */}
          <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ReactFlow
              nodes={displayedNodes}
              edges={displayedEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              nodeTypes={nodeTypes}
              nodesDraggable={!isRunning}
              nodesConnectable={!isRunning}
              deleteKeyCode={isRunning ? null : ["Backspace", "Delete"]}
              edgesReconnectable={!isRunning}
              edgesFocusable={!isRunning}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">

            {/* Prompt editor */}
            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Node Editor
              </h2>

              {selectedNode ? (
                <>
                  <p className="mb-2 text-sm text-slate-500">
                    Edit AI prompt:
                  </p>

                  <textarea
                    value={selectedNode.data.prompt}
                    onChange={(e) => updatePrompt(e.target.value)}
                    disabled={isRunning}
                    className="h-28 w-full rounded-lg border border-slate-300 p-3 text-sm disabled:opacity-50"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Green = YES · Red = NO
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Click a node to edit its question.
                </p>
              )}
            </section>

            {/* Workflow runner */}
            <section className="border-t pt-4">
              <h2 className="mb-3 text-lg font-semibold">
                Run Workflow
              </h2>

              <textarea
                value={workflowInput}
                onChange={(e) => setWorkflowInput(e.target.value)}
                disabled={isRunning}
                placeholder="Enter a customer message..."
                className="mb-3 h-24 w-full rounded-lg border border-slate-300 p-3 text-sm disabled:opacity-50"
              />

              <button
                onClick={startWorkflow}
                disabled={isRunning}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {isRunning ? "Running..." : "▶ Run Workflow"}
              </button>

              {runState && (
                <p className="mt-3 text-sm">
                  Status: <strong>{runState.status}</strong>
                </p>
              )}

              {(runError || runState?.error) && (
                <p className="mt-3 break-words text-sm text-red-600">
                  {runError || runState?.error}
                </p>
              )}
            </section>

            {/* Execution history */}
            <section className="border-t pt-4">
              <h2 className="mb-3 text-lg font-semibold">
                Execution Logs
              </h2>

              {runState?.logs.length ? (
                <div className="space-y-3">
                  {runState.logs.map((log, index) => (
                    <div
                      key={`${log.nodeId}-${index}`}
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-medium">
                        {index + 1}. {log.prompt}
                      </p>

                      <p
                        className={
                          log.answer === "YES"
                            ? "mt-2 font-bold text-green-600"
                            : "mt-2 font-bold text-red-600"
                        }
                      >
                        {log.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Run a workflow to see its execution history.
                </p>
              )}
            </section>

            <div className="border-t pt-4 text-sm text-slate-500">
              <p>Nodes: {nodes.length}</p>
              <p>Connections: {edges.length}</p>

              <p className="mt-2">
                Your graph saves automatically in this browser.
              </p>
            </div>

          </aside>
        </div>
      </div>
    </main>
  );
}
