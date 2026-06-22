import { KnowledgeNode } from '../types.js';

export const gaapSeed = {
  nodes: [
    {
      id: "gaap-revenue-606",
      type: "Rule",
      content: {
        statement: "ASC 606: Recognize revenue when control of promised goods/services transfers to customer in amount reflecting consideration expected.",
        criteria: ["identify contract", "performance obligations", "transaction price", "allocate", "recognize when satisfied"]
      },
      provenance: {
        source_id: "fasb-asc-606",
        locator: "ASC 606-10-25",
        effective_from: "2018",
        jurisdiction: ["US"]
      },
      dimensions: {
        standard_family: ["GAAP", "US-GAAP"],
        domain: ["accounting", "revenue"]
      },
      confidence: 1.0
    },
    {
      id: "gaap-matching-principle",
      type: "Principle",
      content: {
        statement: "Expenses should be matched with the revenues they help generate in the same period (accrual basis)."
      },
      provenance: {
        source_id: "gaap-conceptual-framework",
        locator: "FASB Concepts Statement No. 8",
        effective_from: "ongoing"
      },
      dimensions: {
        standard_family: ["GAAP"],
        domain: ["accounting"]
      },
      confidence: 1.0
    },
    {
      id: "gaap-asset-recognition",
      type: "Definition",
      content: {
        statement: "Assets are probable future economic benefits obtained or controlled by a particular entity as a result of past transactions or events."
      },
      provenance: {
        source_id: "fasb-concepts-6",
        locator: "CON 6",
        effective_from: "1985"
      },
      dimensions: {
        standard_family: ["GAAP"],
        domain: ["accounting"]
      },
      confidence: 1.0
    }
  ] as KnowledgeNode[],
  edges: [
    { from: "gaap-revenue-606", to: "gaap-matching-principle", type: "requires" as const },
    { from: "gaap-asset-recognition", to: "gaap-revenue-606", type: "applies_to" as const }
  ]
};
