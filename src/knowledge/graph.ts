import { KnowledgeNode, KnowledgeEdge, Subgraph, DimensionSet } from './types.js';

// Simple in-memory graph. No full load - filtered views only.
export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  edges: KnowledgeEdge[];
}

export function createGraph(): KnowledgeGraph {
  return { nodes: new Map(), edges: [] };
}

export function ingest(graph: KnowledgeGraph, nodes: KnowledgeNode[], edges: KnowledgeEdge[] = []): KnowledgeGraph {
  const newNodes = new Map(graph.nodes);
  nodes.forEach(n => newNodes.set(n.id, { ...n })); // immutable copy
  return {
    nodes: newNodes,
    edges: [...graph.edges, ...edges]
  };
}

// Match all provided levers (intersection)
function matchesDimensions(node: KnowledgeNode, levers: DimensionSet, asOf?: string): boolean {
  const dims = node.dimensions;
  for (const [key, val] of Object.entries(levers)) {
    if (val === undefined) continue;
    const nodeVal = (dims as any)[key];
    if (!nodeVal) return false;
    if (Array.isArray(val)) {
      if (!val.some(v => (nodeVal as any[]).includes(v))) return false;
    } else if (nodeVal !== val) return false;
  }
  if (asOf && dims.time_validity) {
    if (dims.time_validity.from > asOf) return false;
    if (dims.time_validity.to && dims.time_validity.to < asOf) return false;
  }
  return true;
}

export function fetch(
  graph: KnowledgeGraph,
  query: string,
  levers: DimensionSet = {},
  asOf?: string,
  maxDepth = 3
): Subgraph {
  // Simple: find by id or content match, then filter dims, limited traversal
  const matched: KnowledgeNode[] = [];
  const usedEdges: KnowledgeEdge[] = [];
  const citations: string[] = [];

  for (const node of graph.nodes.values()) {
    const contentStr = JSON.stringify(node.content).toLowerCase();
    if (node.id.includes(query) || contentStr.includes(query.toLowerCase())) {
      if (matchesDimensions(node, levers, asOf)) {
        matched.push(node);
        citations.push(`${node.provenance.source_id} ${node.provenance.locator}`);
      }
    }
  }

  // Limited traversal for interacts etc.
  let current = [...matched];
  for (let d = 0; d < maxDepth; d++) {
    const next: KnowledgeNode[] = [];
    for (const edge of graph.edges) {
      const fromNode = matched.find(n => n.id === edge.from) || current.find(n => n.id === edge.from);
      if (fromNode && (edge.type === 'interacts_with' || edge.type === 'applies_to' || edge.type === 'derives_from')) {
        const toNode = graph.nodes.get(edge.to);
        if (toNode && matchesDimensions(toNode, levers, asOf) && !matched.some(m => m.id === toNode.id)) {
          next.push(toNode);
          usedEdges.push(edge);
          citations.push(`${toNode.provenance.source_id} ${toNode.provenance.locator}`);
        }
      }
    }
    matched.push(...next);
    current = next;
  }

  return {
    nodes: matched,
    edges: usedEdges,
    citations: [...new Set(citations)]
  };
}

// Load from JSON seed (for package, can embed or load user)
export function loadSeed(graph: KnowledgeGraph, seed: { nodes: KnowledgeNode[]; edges?: KnowledgeEdge[] }): KnowledgeGraph {
  return ingest(graph, seed.nodes, seed.edges || []);
}
