import { KnowledgeNode } from '../types.js';

/**
 * Canon for investing / financial-instruments work: cost basis & lot relief,
 * IFRS 9 classification and measurement, and performance reporting (GIPS).
 * These back trade, P&L, and valuation logic with citable provenance.
 */
export const instrumentsSeed = {
  nodes: [
    {
      id: "tax-cost-basis-1012",
      type: "Rule",
      content: {
        statement: "Cost basis of property is generally its cost; gain or loss on disposition is amount realized minus adjusted basis.",
        criteria: ["acquisition cost incl. commissions", "adjusted basis", "amount realized", "gain = realized - basis"]
      },
      provenance: {
        source_id: "us-irc",
        locator: "IRC §1011-1012; Treas. Reg. 1.1012-1",
        effective_from: "1954",
        jurisdiction: ["US"]
      },
      dimensions: {
        standard_family: ["US-TAX"],
        domain: ["investing", "tax", "cost-basis"],
        asset_class: ["equity", "crypto", "fund"]
      },
      confidence: 1.0
    },
    {
      id: "tax-lot-relief-fifo",
      type: "Rule",
      content: {
        statement: "Absent adequate identification of shares sold, the first-in first-out (FIFO) convention determines which lots are deemed sold.",
        methods: ["FIFO (default)", "specific identification", "average cost (funds)"]
      },
      provenance: {
        source_id: "us-irc",
        locator: "Treas. Reg. 1.1012-1(c)",
        effective_from: "1954",
        jurisdiction: ["US"]
      },
      dimensions: {
        standard_family: ["US-TAX"],
        domain: ["investing", "tax", "lot-relief"]
      },
      confidence: 1.0
    },
    {
      id: "ifrs9-classification",
      type: "Rule",
      content: {
        statement: "Financial assets are classified and measured at amortised cost, FVOCI, or FVTPL based on the business model and the contractual cash flow (SPPI) test.",
        categories: ["amortised cost", "FVOCI", "FVTPL"]
      },
      provenance: {
        source_id: "iasb-ifrs9",
        locator: "IFRS 9.4.1",
        effective_from: "2018",
        jurisdiction: ["IFRS"]
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["investing", "financial-instruments"],
        asset_class: ["equity", "bond", "crypto"]
      },
      confidence: 1.0
    },
    {
      id: "valuation-fair-value-113",
      type: "Principle",
      content: {
        statement: "Fair value is the price to sell an asset in an orderly transaction between market participants at the measurement date; mark to observable inputs where available.",
        hierarchy: ["Level 1 quoted", "Level 2 observable", "Level 3 unobservable"]
      },
      provenance: {
        source_id: "fasb-asc-820",
        locator: "ASC 820 / IFRS 13",
        effective_from: "2011"
      },
      dimensions: {
        standard_family: ["GAAP", "IFRS", "VALUATION"],
        domain: ["investing", "valuation"]
      },
      confidence: 1.0
    },
    {
      id: "gips-time-weighted-return",
      type: "Rule",
      content: {
        statement: "Performance must be calculated using time-weighted rates of return that remove the effect of external cash flows; money-weighted (IRR) is permitted in defined cases.",
      },
      provenance: {
        source_id: "cfa-gips",
        locator: "GIPS 2020 Provisions 2.A",
        effective_from: "2020"
      },
      dimensions: {
        standard_family: ["GIPS"],
        domain: ["investing", "performance"]
      },
      confidence: 0.95
    },
    {
      id: "lot-relief-specific-id",
      type: "Rule",
      content: {
        statement: "When adequate identification is made, specific lot (specific identification) method may be used to determine cost basis of securities sold; must be documented contemporaneously. FIFO is default if no identification.",
        methods: ["specific identification (with ID)", "FIFO (default absent ID)"]
      },
      provenance: {
        source_id: "us-irc",
        locator: "Treas. Reg. 1.1012-1(c)(2)-(8)",
        effective_from: "1954",
        jurisdiction: ["US"]
      },
      dimensions: {
        standard_family: ["US-TAX"],
        domain: ["investing", "tax", "lot-relief", "cost-basis"],
        asset_class: ["equity", "crypto"]
      },
      confidence: 1.0
    }
  ] satisfies KnowledgeNode[],
  edges: [
    { from: "tax-lot-relief-fifo", to: "tax-cost-basis-1012", type: "derives_from" as const },
    { from: "ifrs9-classification", to: "valuation-fair-value-113", type: "requires" as const },
    { from: "gips-time-weighted-return", to: "valuation-fair-value-113", type: "applies_to" as const }
  ]
};
