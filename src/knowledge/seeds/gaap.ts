import { KnowledgeNode, KnowledgeEdge } from '../types.js';

export const gaapSeed = {
  nodes: [
    {
      id: "gaap-revenue-recognition",
      type: "Rule",
      content: {
        statement: "Under US GAAP (ASC 606), revenue is recognized when (or as) performance obligations are satisfied, at the transaction price allocated to each obligation."
      },
      provenance: {
        source_id: "asc-606",
        locator: "Revenue from Contracts with Customers",
        effective_from: "2018"
      },
      dimensions: {
        standard_family: ["GAAP"],
        domain: ["accounting", "revenue"]
      },
      confidence: 1.0
    },
    {
      id: "gaap-matching-principle",
      type: "Principle",
      content: {
        statement: "Expenses are matched to the revenues they help generate in the same period (accrual basis)."
      },
      provenance: {
        source_id: "gaap-concepts",
        locator: "FASB Conceptual Framework",
        effective_from: "ongoing"
      },
      dimensions: {
        standard_family: ["GAAP"],
        domain: ["accounting", "expense"]
      },
      confidence: 1.0
    }
  ] as KnowledgeNode[],
  edges: [
    { from: "gaap-revenue-recognition", to: "double-entry-principle", type: "requires" },
    { from: "gaap-matching-principle", to: "expense-recognition-accrual", type: "derives_from" }
  ] as KnowledgeEdge[]
};