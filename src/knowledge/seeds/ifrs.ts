import { KnowledgeNode, KnowledgeEdge } from '../types.js';

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
    },
    // Revenue recognition (IFRS 15 inspired)
    {
      id: "ifrs15-revenue-recognition-5step",
      type: "Rule",
      content: {
        statement: "IFRS 15 revenue from contracts with customers uses 5-step model: identify contract, performance obligations, transaction price, allocate price, recognize when (or as) obligations satisfied."
      },
      provenance: {
        source_id: "ifrs-15",
        locator: "IFRS 15 Revenue from Contracts with Customers",
        effective_from: "2018",
        jurisdiction: ["IFRS"]
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting", "revenue"]
      },
      confidence: 1.0
    },
    // Double-entry principle (core doctrine)
    {
      id: "double-entry-principle",
      type: "Principle",
      content: {
        statement: "Every financial transaction affects at least two accounts with equal total debits and credits. This ensures the accounting equation (Assets = Liabilities + Equity) is preserved."
      },
      provenance: {
        source_id: "accounting-fundamentals",
        locator: "GAAP/IFRS conceptual frameworks",
        effective_from: "ongoing"
      },
      dimensions: {
        standard_family: ["IFRS", "GAAP"],
        domain: ["accounting"]
      },
      confidence: 1.0
    },
    // Expense recognition (accrual basis)
    {
      id: "expense-recognition-accrual",
      type: "Rule",
      content: {
        statement: "Expenses are recognized when incurred (accrual), not when paid. Match expenses to the periods in which they help generate revenue (matching principle)."
      },
      provenance: {
        source_id: "ifrs-conceptual-framework-2018",
        locator: "Chapter 4, Conceptual Framework",
        effective_from: "2018"
      },
      dimensions: {
        standard_family: ["IFRS", "GAAP"],
        domain: ["accounting", "expense"]
      },
      confidence: 0.95
    },
    // Liability definition
    {
      id: "ifrs-liability-definition",
      type: "Definition",
      content: {
        statement: "A liability is a present obligation of the entity arising from past events, the settlement of which is expected to result in an outflow of resources embodying economic benefits."
      },
      provenance: {
        source_id: "ifrs-conceptual-framework-2018",
        locator: "Chapter 4, para 4.26",
        effective_from: "2018"
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting", "liabilities"]
      },
      confidence: 1.0
    },
    // IFRS 16 Leases (for recognition of right-of-use asset + liability)
    {
      id: "ifrs16-lease-recognition",
      type: "Rule",
      content: {
        statement: "IFRS 16 requires lessees to recognize a right-of-use asset and a lease liability for most leases. Initial measurement at present value of lease payments; subsequent depreciation of ROU asset and interest on liability."
      },
      provenance: {
        source_id: "ifrs-16",
        locator: "IFRS 16 Leases, paras 22-47",
        effective_from: "2019-01",
        jurisdiction: ["IFRS"]
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting", "leases", "assets", "liabilities"]
      },
      confidence: 1.0
    },
    // IAS 16 / depreciation (measurement and allocation)
    {
      id: "ias16-depreciation-systematic",
      type: "Rule",
      content: {
        statement: "The depreciable amount of PPE is allocated on a systematic basis over its useful life. Method (straight-line, diminishing, units) reflects pattern of consumption of future economic benefits. Review useful life and residual at least annually."
      },
      provenance: {
        source_id: "ias-16",
        locator: "IAS 16 Property, Plant and Equipment, paras 48-62",
        effective_from: "2003-as-revised"
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting", "assets", "depreciation", "measurement"]
      },
      confidence: 1.0
    },
    // IAS 2 Inventories
    {
      id: "ias2-inventory-lower-of-cost-nrv",
      type: "Rule",
      content: {
        statement: "Inventories measured at the lower of cost and net realizable value (NRV). Cost includes purchase, conversion, and other costs to bring to present location/condition. NRV is estimated selling price less completion and selling costs."
      },
      provenance: {
        source_id: "ias-2",
        locator: "IAS 2 Inventories, paras 9-33",
        effective_from: "2003-as-revised"
      },
      dimensions: {
        standard_family: ["IFRS"],
        domain: ["accounting", "assets", "inventory", "measurement"]
      },
      confidence: 1.0
    }
  ] as KnowledgeNode[],
  edges: [
    { from: "ifrs-cf-2018-elements-asset-4.3", to: "ifrs-cf-2018-objective-1.2", type: "derives_from" },
    { from: "ifrs-cf-2018-elements-asset-4.3", to: "valuation-multiple-distinction", type: "interacts_with" },
    { from: "fomc-2pct-inflation-target", to: "macro-18yr-property-cycle", type: "applies_to" },
    { from: "ifrs-cf-2018-elements-asset-4.3", to: "double-entry-principle", type: "derives_from" },
    { from: "ifrs15-revenue-recognition-5step", to: "double-entry-principle", type: "requires" },
    { from: "ifrs-liability-definition", to: "double-entry-principle", type: "requires" },
    { from: "expense-recognition-accrual", to: "ifrs15-revenue-recognition-5step", type: "interacts_with" },
    { from: "ifrs16-lease-recognition", to: "double-entry-principle", type: "requires" },
    { from: "ifrs16-lease-recognition", to: "ifrs-cf-2018-elements-asset-4.3", type: "derives_from" },
    { from: "ias16-depreciation-systematic", to: "ifrs-cf-2018-elements-asset-4.3", type: "derives_from" },
    { from: "ias2-inventory-lower-of-cost-nrv", to: "ifrs-cf-2018-elements-asset-4.3", type: "derives_from" }
  ] as KnowledgeEdge[]
};
