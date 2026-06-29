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
    },
    {
      id: "gaap-matching-principle-detail",
      type: "Principle",
      content: {
        statement: "Matching principle requires that costs directly associated with revenue generation (e.g. COGS, sales commissions) be recognized in the same period as the related revenue. Accruals and deferrals implement this; systematic allocation for long-lived assets."
      },
      provenance: {
        source_id: "fasb-concepts-6",
        locator: "CON 6 / ASC 605/606 application guidance",
        effective_from: "ongoing"
      },
      dimensions: {
        standard_family: ["GAAP"],
        domain: ["accounting", "revenue", "expense"]
      },
      confidence: 0.95
    },
    {
      id: "gaap-period-cutoff-closing",
      type: "Rule",
      content: {
        statement: "GAAP requires formal period-end cutoff procedures. After books for a period are closed, no entries with effective dates in the closed period may be recorded without specific approval and adjusting entries posted in the open period. Prevents backdating and management override."
      },
      provenance: {
        source_id: "fasb-conceptual-framework",
        locator: "CON 8 / AU-C 560 / internal control frameworks (COSO)",
        effective_from: "ongoing",
        jurisdiction: ["US"]
      },
      dimensions: {
        standard_family: ["GAAP", "US-GAAP"],
        domain: ["accounting", "period-end", "internal-control"]
      },
      confidence: 0.95
    },
    {
      id: "gaap-closing-entries-re",
      type: "Rule",
      content: {
        statement: "At the end of an accounting period, temporary accounts (revenues, expenses, dividends) are closed to Retained Earnings (or equivalent equity account) so that the next period begins with zero balances in income statement accounts. Net income/loss is transferred; the accounting equation is preserved."
      },
      provenance: {
        source_id: "gaap-accounting-cycle",
        locator: "FASB Concepts / intermediate accounting standards",
        effective_from: "ongoing"
      },
      dimensions: {
        standard_family: ["GAAP"],
        domain: ["accounting", "closing", "retained-earnings"]
      },
      confidence: 1.0
    }
  ] satisfies KnowledgeNode[],
  edges: [
    { from: "gaap-revenue-606", to: "gaap-matching-principle", type: "requires" as const },
    { from: "gaap-asset-recognition", to: "gaap-revenue-606", type: "applies_to" as const },
    { from: "gaap-matching-principle-detail", to: "gaap-closing-entries-re", type: "requires" as const }
  ]
};
