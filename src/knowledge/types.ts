export interface DimensionSet {
  jurisdiction?: string[];
  standard_family?: string[];
  time_validity?: { from: string; to?: string };
  domain?: string[];
  asset_class?: string[];
  regulatory_pillar?: string[];
}

export interface KnowledgeNode {
  id: string;
  type: 'Source' | 'Principle' | 'Rule' | 'Fact' | 'Concept' | 'HistoricalCase' | 'Policy' | 'Definition';
  content: Record<string, any>;
  provenance: {
    source_id: string;
    locator: string;
    effective_from: string;
    effective_to?: string;
    jurisdiction?: string[];
    url?: string;
  };
  dimensions: DimensionSet;
  confidence: number;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  type: 'derives_from' | 'specializes' | 'applies_to' | 'interacts_with' | 'overrides' | 'requires' | 'affects';
  attributes?: Record<string, any>;
}

export interface Subgraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  citations: string[]; // provenance strings
}
