import { KnowledgeNode } from '../types.js';

export const ifrsSeed = {
  nodes: [
    {
      id: "ifrs-cf-2018-objective-1.2",
      type: "Principle",
      content: {
        statement: "The objective of general purpose financial reporting is to provide financial information about the reporting entity that is useful to existing and potential investors, lenders and other creditors in making decisions relating to providing resources to the entity."
      },
      provenance: {
        source_id: "ifrs-conceptual-framework-2018",
        locator: "Chapter 1, para 1.2",
        effective_from: "2018-03",
        url: "https://www.ifrs.org/..."
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting"]
      },
      confidence: 1.0
    },
    {
      id: "ifrs-cf-2018-elements-asset-4.3",
      type: "Definition",
      content: {
        element: "Asset",
        definition: "A present economic resource controlled by the entity as a result of past events."
      },
      provenance: {
        source_id: "ifrs-conceptual-framework-2018",
        locator: "Chapter 4, para 4.3",
        effective_from: "2018-03"
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting"]
      },
      confidence: 1.0
    },
    // FOMC / monetary policy (Economics & Public Policy)
    {
      id: "fomc-2pct-inflation-target",
      type: "Policy",
      content: {
        statement: "The FOMC longer-run goal for inflation is 2 percent (PCE). Policy uses this as anchor for forward guidance and QT/QE calibration."
      },
      provenance: {
        source_id: "fomc-statement-2020-08",
        locator: "Statement on Longer-Run Goals and Monetary Policy Strategy",
        effective_from: "2020-08"
      },
      dimensions: {
        standard_family: ["FOMC"],
        domain: ["monetary_policy", "economics"]
      },
      confidence: 1.0
    },
    // Tax / estate extensible hook example (Tax & Estate Law)
    {
      id: "us-tax-basis-recognition",
      type: "Rule",
      content: {
        statement: "For US federal income tax, recognize gain/loss on realization; basis carries over in many non-recognition transactions. Jurisdiction-specific rates and rules applied at transaction time via external data."
      },
      provenance: {
        source_id: "irc-subchapter-o",
        locator: "IRC Sections 1001, 1012, 351/721 examples",
        effective_from: "1986-as-amended",
        jurisdiction: ["US"]
      },
      dimensions: {
        standard_family: ["US-TAX"],
        domain: ["tax", "accounting"],
        jurisdiction: ["US"]
      },
      confidence: 0.95
    },
    // Macro example (Economics) - 18.6 year property cycle reference per role
    {
      id: "macro-18yr-property-cycle",
      type: "HistoricalCase",
      content: {
        statement: "Long-term real estate and credit cycles often exhibit ~18-19 year periodicity (Kuznets / derivative of longer waves). Models must support structured time dimensions for scenario analysis."
      },
      provenance: {
        source_id: "historical-cycle-analysis",
        locator: "Kuznets swings,  real estate literature",
        effective_from: "1930s-ongoing"
      },
      dimensions: {
        standard_family: ["MACRO"],
        domain: ["economics", "public_policy"]
      },
      confidence: 0.8
    },
    // Finance valuation distinction (Finance & Capital Management)
    {
      id: "valuation-multiple-distinction",
      type: "Concept",
      content: {
        statement: "Valuation multiples must be explicit: EV/Revenue vs EV/EBITDA or P/E. Inputs for revenue-multiple vs earnings-multiple must never be conflated; all valuation mechanisms require explicit definition of numerator/denominator."
      },
      provenance: {
        source_id: "valuation-best-practices",
        locator: "Institutional finance standards",
        effective_from: "ongoing"
      },
      dimensions: {
        standard_family: ["VALUATION"],
        domain: ["finance", "capital_management"]
      },
      confidence: 1.0
    }
  ] as KnowledgeNode[],
  edges: []
};
