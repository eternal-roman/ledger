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
    }
  ] as KnowledgeNode[],
  edges: []
};
