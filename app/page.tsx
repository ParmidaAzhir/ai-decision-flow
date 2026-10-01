
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

// Define our AI decision node
type DecisionNodeType = Node<
  { prompt: string },
  "decision"
>;

// Custom decision node
function DecisionNode({ data }: NodeProps<DecisionNodeType>) {
  return (
    <div className="relative min-w-56 max-w-64 rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-md">

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
        style={{
          left: "25%",
          background: "#16a34a",
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{
          left: "75%",
          background: "#dc2626",
        }}
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

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [loaded, setLoaded] = useState(false);

  // Load previously saved workflow
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

  // Automatically save workflow
  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      "ai-decision-flow",
      JSON.stringify({ nodes, edges })
    );
  }, [nodes, edges, loaded]);

  // Add a new decision node
  const addNode = () => {
    setNodes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "decision",
        position: {
          x: 100 + current.length * 60,
          y: 100 + current.length * 60,
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

      // Only one connection per YES/NO handle
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

  // Update the selected node prompt
  const updatePrompt = (prompt: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? {
              ...node,
              data: {
                ...node.data,
                prompt,
              },
            }
          : node
      )
    );
  };

  // Clear all nodes and connections
  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">

      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">

          <div>
            <h1 className="text-3xl font-bold">
              AI Decision Flow
            </h1>

            <p className="mt-2 text-slate-500">
              Build visual YES/NO AI workflows
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={addNode}
              className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-white"
            >
              + Add Decision
            </button>

            <button
              onClick={clearWorkflow}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2"
            >
              Clear
            </button>

          </div>

        </div>

        {/* Workflow editor */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

          {/* React Flow Canvas */}
          <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white">

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>

          </div>

          {/* Node Editor */}
          <aside className="rounded-xl border border-slate-200 bg-white p-5">

            <h2 className="mb-4 text-xl font-semibold">
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
                  className="h-36 w-full rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="Enter your YES/NO question..."
                />

                <p className="mt-4 text-xs text-slate-500">
                  Drag the green handle for YES and the red
                  handle for NO.
                </p>

              </>
            ) : (

              <p className="text-sm text-slate-500">
                Click a node to edit its question.
              </p>

            )}

            <div className="mt-8 border-t pt-4 text-sm text-slate-500">
              <p>Nodes: {nodes.length}</p>
              <p>Connections: {edges.length}</p>

              <p className="mt-3">
                Changes save automatically.
              </p>
            </div>

          </aside>

        </div>

      </div>

    </main>
  );
}
