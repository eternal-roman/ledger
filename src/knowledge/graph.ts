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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A query term matches a node when it is an id token (id split on non-alphanumeric) or
 * a whole word in the node's content. Whole-word matching prevents false positives like
 * "tax" matching "syntax".
 */
function nodeMatchesQuery(node: KnowledgeNode, query: string): boolean {
  // Split only on a whitespace-delimited " OR " or a literal "|" — never the substring
  // "or", which would shatter words like "inventory" (invent|or|y).
  const terms = query.toLowerCase().trim().split(/\s+or\s+|\s*\|\s*/i).filter(Boolean);
  if (terms.length === 0) return false;
  const idTokens = node.id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const contentStr = JSON.stringify(node.content).toLowerCase();
  return terms.some(t =>
    idTokens.includes(t) || new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(contentStr)
  );
}

export function fetch(
  graph: KnowledgeGraph,
  query: string,
  levers: DimensionSet = {},
  asOf?: string,
  maxDepth = 3
): Subgraph {
  // Find by id token or whole-word content match + dims, limited traversal. Dedup by id.
  const matched: KnowledgeNode[] = [];
  const seen = new Set<string>();
  const usedEdges: KnowledgeEdge[] = [];

  for (const node of graph.nodes.values()) {
    if (nodeMatchesQuery(node, query) && matchesDimensions(node, levers, asOf)) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        matched.push(node);
      }
    }
  }

  // BFS-style limited traversal over relation edges
  let current = [...matched];
  for (let d = 0; d < maxDepth; d++) {
    const next: KnowledgeNode[] = [];
    for (const edge of graph.edges) {
      if (!['interacts_with', 'applies_to', 'derives_from'].includes(edge.type)) continue;
      const fromNode = current.find(n => n.id === edge.from);
      if (fromNode) {
        const toNode = graph.nodes.get(edge.to);
        if (toNode && matchesDimensions(toNode, levers, asOf) && !seen.has(toNode.id)) {
          seen.add(toNode.id);
          next.push(toNode);
          usedEdges.push(edge);
        }
      }
    }
    matched.push(...next);
    current = next;
  }

  // Rank by confidence (desc), then id (asc) — deterministic and confidence-aware.
  matched.sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
  const citations = [...new Set(matched.map(n => `${n.provenance.source_id} ${n.provenance.locator}`))];

  return { nodes: matched, edges: usedEdges, citations };
}

// Load from JSON seed (for package, can embed or load user)
export function loadSeed(graph: KnowledgeGraph, seed: { nodes: KnowledgeNode[]; edges?: KnowledgeEdge[] }): KnowledgeGraph {
  return ingest(graph, seed.nodes, seed.edges || []);
}
