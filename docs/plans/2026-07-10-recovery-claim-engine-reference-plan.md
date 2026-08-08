# Recovery Claim Engine — Complete Reference Plan

**Document ID:** `RCE-PLAN-2026-07-10`  
**Status:** REFERENCE ONLY — not approved for implementation; not committed as a product decision  
**Created:** 2026-07-10  
**Workspace context:** `@eternal-roman/ledger` main (observed ~v0.18.0 / `e7463b0` era)  
**Intent:** Unabridged capture of product research, business model, trust constraints, architecture, and implementation surface for a **trustable, usable recovery/reclaim product**. Enables a future researcher or implementer agent to reconnect without the originating conversation.

---

## 0. Agent reconnection protocol (read first)

### 0.1 Purpose of this document

This file is a **full tether** for later sessions. It records:

1. Objective reality of the current Ledger repo (what it is / is not).
2. The recovery-audit / reclaimant business model (researched).
3. Assets those businesses review.
4. Gap analysis from Ledger → recovery product.
5. Trust and human-labor constraints at scale.
6. Complete product, architecture, data, and technical plan with no intentional shortcuts.

**Do not treat this as a mandate to build.** Treat it as the single source of recovered context for planning, scoping, or phased implementation.

### 0.2 How a researcher agent should reconnect

1. Read **§0–§3** for product truth and constraints (non-negotiable).
2. Read **§4–§5** for business model and assets (why money exists).
3. Read **§6–§7** for gap and trust model (what not to over-promise).
4. Read **§8–§14** for full system design (what to build).
5. Read **§15–§17** for phased delivery, risks, and open decisions.
6. Read **§18** for file/map of related repo artifacts and external citations.
7. Before implementing any vertical, re-validate market assumptions against primary sources listed in **§18.2** (dates drift; laws and portals change).

### 0.3 Implementation agent checklist (when authorized)

- [ ] Confirm product decision: which vertical (default recommendation: AP high-confidence duplicates).
- [ ] Confirm deployment model: internal tool vs multi-tenant SaaS vs services-attached platform.
- [ ] Confirm money kernel strategy: reuse `@eternal-roman/ledger` vs extract thin Money-only package vs reimplement with same invariants.
- [ ] Confirm human-in-the-loop policy matrix (§7.4) is product law, not optional UX.
- [ ] Never ship “auto-file all claims” without confidence gates + dual control on high $ (§7).
- [ ] Never use native floats for claim amounts (§8.4, Ledger AGENTS.md).
- [ ] Do not expand into tariff/customs until AP claim lifecycle is proven (§15).

### 0.4 Non-goals of this plan document

- Not a PR implementation task list for current Ledger kernel features.
- Not approval to delete or rewrite Ledger’s investing/IFRS/MCP surfaces.
- Not legal advice; customs/tax content is architectural only — specialists required in production.

### 0.5 Related conversation conclusions (immutable for this plan)

| Conclusion | Implication |
|------------|-------------|
| Ledger kernel does exact money + double-entry reliably | Reuse for claim $ and fee math only |
| Ledger as product “does something, nothing well” across many thin layers | Recovery product must **narrow** ruthlessly |
| Recovery is contingency reclaim, not Big Four audit opinion | Success = recovered cash + defensible claim pack |
| Full autonomy is not trustable at scale | Force-multiply humans; do not eliminate validation/collection |
| #72-style determinism hygiene and TS/zod majors are non-essential to this product | Do not block on them |

---

## 1. Executive summary

### 1.1 Opportunity

There is a mature **recovery audit / profit recovery / contingency reclaim** industry:

- Find **overpayments, missed credits, duty/tax mistakes** after payment.
- Prove them with evidence vendors or agencies accept.
- Collect refunds/credits.
- Charge **~10–40% of amounts actually recovered** (often ~20–30% for AP recovery), frequently **no recovery → no fee**.

Reported industry shape (order-of-magnitude, not guarantees):

- AP recovery services market cited ~**$1.05B (2024)** growing toward ~**$1.5B (2030)** (third-party market research cited by industry guides).
- Typical AP audit recoveries often framed as ~**$1M per $1B supplier spend**, or roughly **0.1–2%** of spend depending on maturity and prior audits.

### 1.2 Product thesis

Build a **Recovery Claim Engine (RCE)**:

> Ingest payables (and later trade) data → detect reclaimable **paid − entitled** deltas with exact money → attach evidence → human/auto gates → track collection → compute contingency fee.

Positioning:

- **Yes:** Claims factory with exact money, audit trail, workflow.
- **No:** “AI accountant that replaces recovery firms” or “general ledger product.”
- **No:** Fully unsupervised auto-reclaim of all leakage.

### 1.3 Kernel relationship

Current `@eternal-roman/ledger` is a **pure TS exact-decimal double-entry kernel + MCP/skills costume**. It is **trustworthy for arithmetic and balanced journals** when called correctly. It is **not** a recovery product.

**Reuse:** `Money`, deterministic serialization, optional immutable snapshots/hashes for claim packages and fee journals.  
**Do not reuse as product spine:** trading, IFRS16, investing layers, agent persona as the primary UX.

### 1.4 Trust at scale (hard constraint)

| Trust type | Scalable without humans? |
|------------|---------------------------|
| Arithmetic | Yes (software) |
| Process / audit trail | Yes (software) |
| Finding correctness | Partially (high-confidence classes only) |
| Collection | No (ops + counterparty) |

Product law: **machines propose; policy or humans accept; system records truth of recovery.**

---

## 2. Current Ledger reality (basis for objective truth)

### 2.1 What ships on main (functional)

| Surface | Role | Functional today? |
|---------|------|-------------------|
| `@eternal-roman/ledger` | Exact `Money`, `JournalEntry`, `validateEntry`, immutable `Ledger`, `auditHash` | Yes |
| Layers (trading, portfolio, investing, crypto, periods, closing, FX, dep, cashflow, reconcile, IFRS16) | Pure helpers on kernel | Yes as libraries/demos |
| MCP (`ledger-mcp`) | Agent tools over kernel | Yes if agent cooperates |
| Skills / commands / hooks | Guidance + best-effort enforcement | Partial |
| Python reference | Parallel kernel | Reference only |
| Persistence / multi-tenant / ERP | — | **Absent** |

### 2.2 What is reliable vs soft

- **Reliable:** exact decimal, reject unbalanced entries, scale in JSON/hash, equation checks, golden-master paths (e.g. IFRS 16 lessee tests).
- **Soft:** agent compliance, citation graph as “full canon,” product completeness of each domain layer, wall-clock defaults on some factories (hygiene only).

### 2.3 Implications for RCE

RCE must be a **new product system** (data plane + detection + claim CRM + collection) with Ledger (or extracted Money) as a **dependency for money truth**, not the application architecture.

---

## 3. Problem statement and success definition

### 3.1 Problem

Businesses leak cash via payment and duty errors. Finding and recovering that cash is:

1. Data-heavy (many systems).
2. Evidence-heavy (vendors dispute).
3. Labor-heavy (validation + collection).
4. Economically large enough to support contingency fees.

Existing recovery firms (PRGX-class and peers) combine tech + human expertise. Software pure-plays that only “flag anomalies” without claim lifecycle under-deliver.

### 3.2 Success metrics (product)

| Metric | Definition | Target direction |
|--------|------------|------------------|
| Precision@auto | Share of auto-approved claims later recovered or not disputed | High (prefer false negative over false positive) |
| Precision@validated | Share of human-validated claims that recover | High |
| $ recovered / analyst-hour | Force-multiplier KPI | Increase over time |
| Time-to-first-valid-claim | Onboarding → first validated claim | Decrease |
| Evidence completeness | % claims with required evidence set | → 100% before submit |
| Fee reconciliation | Contingency fee = f(recovered), exact | Zero drift |
| Client trust incidents | Bad claims filed / relationship damage | → 0 critical |

### 3.3 Explicit non-success

- High recall of “possible issues” with low recoverability.
- Demo-only agent workflows without claim objects.
- Balanced GL without reclaim outcomes.

---

## 4. Business model research (recovery / reclaimant)

### 4.1 Industry names

- Accounts Payable (AP) recovery audit  
- Profit recovery / cost recovery audit  
- Contract compliance audit  
- Sales & use tax recovery  
- Freight audit  
- Healthcare RAC (Recovery Audit Contractor) — adjacent, regulated contingency  
- Customs duty refund / drawback / post-entry recovery / episodic tariff refund programs  

### 4.2 Commercial model

| Element | Typical practice |
|---------|------------------|
| Pricing | Contingency **10–40%** of **recovered** amounts; AP often **20–30%** |
| Risk | Client pays little/none unless recovery succeeds |
| Alternatives | Fixed fee + commission; capped contingency (common in government) |
| Value prop | Self-funded via recoveries; minimal internal disruption (vendors claim ~hours/week client time) |
| Secondary value | Root-cause, controls, vendor process improvement |

**Example fee math (exact; must use Money in product):**  
Recovered `$1,000,000` at `17%` contingency → fee `$170,000`; client net `$830,000`.

### 4.3 Six-stage recovery process (industry standard shape)

1. **Pre-audit planning** — scope, security, objectives.  
2. **Discovery / plan** — process gaps, initial opportunities.  
3. **Data acquisition** — ERP, AP, contracts, statements.  
4. **Audit execution** — analytics, candidate generation, QA.  
5. **Validation and recovery** — evidence, vendor engagement, collection.  
6. **Reporting and continuous improvement** — root cause, controls, optional continuous monitoring.

Typical calendar: multi-month engagements; initial findings often **60–90 days**.

### 4.4 What “auditor” means here

| Role | Goal | RCE relevance |
|------|------|---------------|
| Financial statement auditor | Fair presentation opinion | Low |
| Internal audit | Controls | Adjacent (prevention outputs) |
| **Recovery / reclaimant** | Find + prove + collect leakage | **Primary** |
| Tax/customs specialist | Jurisdiction reclaim | Vertical modules |

### 4.5 Two families of reclaim

**Family A — Commercial recovery (MVP path)**  
AP, contracts, tax, freight — counterparty is usually **vendor**.

**Family B — Trade & customs (later vertical)**  
Duty overpay, misclassification, valuation, drawback, program refunds (e.g. large IEEPA-style duty refund waves via CBP ACE/CAPE when applicable). Counterparty is **agency/broker/legal process**. Same contingency *economics*; different data, rules, and filing.

### 4.6 Competitive / market dynamics (product awareness)

- Large recovery firms: deep vendor networks, industry playbooks, AI + humans.  
- In-house continuous control / AP automation tools: shift left (prevent before pay).  
- RCE can position as: (1) modern claim OS for recovery teams, (2) continuous high-confidence leakage detection for finance teams, (3) infrastructure under a services firm.  
- Competing only as “chat with your invoices” without lifecycle is weak.

---

## 5. Assets reviewed (complete inventory)

### 5.1 Commercial AP / contract recovery assets

| Asset | Source systems | Use in detection |
|-------|----------------|------------------|
| Invoice register | ERP AP (SAP, Oracle, NetSuite, Dynamics, etc.) | Billed amounts, vendors, dates, invoice numbers |
| Payment files | ERP + bank | What left cash; duplicates across channels |
| Purchase orders | Procurement | Entitled price/qty |
| Goods receipts / service entry | ERP MM/SRM | Three-way match |
| Vendor master | ERP | Entity resolution, remit-to |
| Supplier statements | Vendor portals / PDF / email | Unapplied credits, open items |
| Contracts / rate cards / SOWs | CLM, shared drives, PDF | Entitled rates, rebates, labor |
| Credit memos / returns | ERP | Missed deductions |
| Tax config / exemption certs | Tax engines, AP tax lines | Sales & use overpay |
| Freight invoices / BOLs / accessorials | TMS, carriers | Rate and surcharge errors |
| P-card / T&E / secondary pay | Banks, card programs | Cross-channel double pay |
| Emails / change orders | Unstructured | Edge-case evidence |

### 5.2 Customs / tariff recovery assets (phase 2+)

| Asset | Use |
|-------|-----|
| Entry summaries / ACE extracts | Assessed duties |
| Commercial invoices / packing lists | Value, description |
| HTS classification history | Rate correctness |
| Broker bills / duty payment proof | Cash trail |
| Import↔export linkage | Drawback eligibility |
| Origin / FTA documentation | Preferential rates |
| Liquidation / protest / CAPE packages | Legal reclaim path |

### 5.3 Common finding types (detection catalog)

**AP / commercial**

- Exact and near-duplicate payments  
- Overpay vs PO / receipt  
- Contract price overages  
- Missed early-pay discounts  
- Unapplied vendor credits / statement credits  
- Missed rebates / volume tiers  
- Incorrect sales tax  
- Freight rate / accessorial errors  
- Labor rate / markup errors (construction, services)  
- Payments on canceled invoices  

**Customs / trade**

- Misclassification (HTS)  
- Valuation errors  
- Missed drawback  
- Missed preferential origin  
- Protest / program refund eligibility  

Each finding type in RCE must be a first-class **Detector** with: `detector_id`, inputs, entitled formula, confidence model, required evidence, default human gate.

---

## 6. Gap analysis: Ledger → Recovery Claim Engine

| Recovery capability | Ledger today | Gap |
|---------------------|--------------|-----|
| Exact claim arithmetic | Money + tests | Reuse |
| Immutable audit of posted journals | auditHash | Different object model (claims ≠ GL) |
| ERP/AP ingest at scale | None | **Build** |
| Invoice↔payment↔PO match | Toy `reconcile_positions` only | **Build** |
| Duplicate / fuzzy detection | None | **Build** |
| Contract → entitled price | None | **Build** |
| Tax / freight / customs engines | Citation seeds ≠ rules | **Build per vertical** |
| Claim lifecycle CRM | None | **Build** |
| Evidence package + vendor workflow | None | **Build** |
| Contingency fee accounting | None | **Build** (can post fee journals via kernel) |
| Multi-tenant secure store | None | **Build** |
| Human queues / dual control | None | **Build** |
| Collection tracking | None | **Build** |
| Agent MCP for recovery domain | Kernel MCP only | Optional later adapter |

**Conclusion:** ~90% of product value is **new system**. Kernel is ~10% trust layer for money.

---

## 7. Trust model and human labor (product law)

### 7.1 Principle

> **Force-multiply humans; do not eliminate validation and collection.**

Full-spectrum autonomous reclaim is not trustable. High-confidence automation for narrow classes is.

### 7.2 Structural human work (cannot fully remove)

1. **Dirty data / entity resolution exceptions**  
2. **Entitlement judgment** (contracts, tax, customs)  
3. **Validation against false positives** (relationship + fee integrity)  
4. **Collection / dispute** (vendor or agency)  
5. **Domain specialists** per vertical  
6. **Liability gates** (dual control above thresholds)

### 7.3 High automation ceiling (invest first)

- Exact duplicate payments  
- Near-duplicate with strong features + score  
- Clean PO three-way quantity/price overage  
- Ranking queues by $ × confidence  
- Claim pack assembly, fee calc, status tracking  
- Continuous monitoring after rules stable  

### 7.4 Policy matrix (must implement)

| Condition | Action |
|-----------|--------|
| Confidence ≥ `auto_threshold` AND amount ≤ `auto_max_amount` AND detector in `auto_allowlist` | May auto-validate |
| Confidence medium OR amount high | Analyst queue |
| Detector complex / new / low precision historically | Always human |
| Amount ≥ `dual_control_threshold` | Two humans or human + manager |
| Status → `submitted` | Requires validated + complete evidence set |
| Status → `recovered` | Requires payment/credit proof artifact |
| LLM-assisted extraction | Never sole authority for entitled amount without deterministic check |

### 7.5 Trust architecture requirements

- Every claim version content-addressable (hash).  
- Every amount is exact decimal type (no float).  
- Every transition has actor, timestamp, reason.  
- Evidence immutability (WORM or content hash store).  
- Client-separable tenancy and encryption.  
- Reproducible detector run (inputs snapshot + detector version + config version → outputs).

---

## 8. Product definition

### 8.1 Product name (working)

**Recovery Claim Engine (RCE)**  
Alt product marketing names deferred.

### 8.2 Personas

| Persona | Needs |
|---------|--------|
| Recovery analyst | Queue, evidence, validate/reject, notes |
| Recovery lead | Dual control, SLAs, throughput metrics |
| Client finance sponsor | Recovered $, fees, minimal disruption |
| Data engineer / integrator | Connectors, mapping, quality |
| Vendor relations (optional) | Professional outreach packs |
| Platform admin | Tenants, SSO, audit logs |
| (Later) Customs specialist | Trade vertical workbench |

### 8.3 Core user journeys

1. **Onboard client / entity** → connect data → map fields → quality report.  
2. **Run detection** → candidates appear ranked.  
3. **Validate claim** → evidence complete → mark validated.  
4. **Submit to vendor** → track dispute/partial.  
5. **Record recovery** → fee computed → report.  
6. **Root cause export** → optional prevention recommendations.  

### 8.4 Money and kernel policy (non-negotiable)

- All monetary values: exact decimal (Ledger `Money.from(string)` or equivalent).  
- Forbid `number`/`float`/`parseFloat` for amounts.  
- Contingency fee: `fee = recovered.mul(rate)` with explicit rate string; rounding policy documented (e.g. half-up to currency scale).  
- Optional: post internal journals for recovered cash and fee income using double-entry for *your* firm’s books — secondary to claim CRM.

### 8.5 MVP scope (must ship before expansion)

**Vertical:** AP **exact + strong near-duplicate** payments, plus optional simple **PO price/qty overage** when PO lines present.

**In scope:**

- Multi-tenant or single-tenant deployable app  
- Ingest: CSV/SFTP for invoices + payments (+ optional PO)  
- Detectors: `dup_exact`, `dup_near`, `po_overpay_simple`  
- Claim lifecycle + evidence + queues + fee  
- Audit log + claim content hash  
- Analyst UI + API  

**Out of scope for MVP:**

- Customs/tariff  
- Full contract NLP  
- Freight  
- Sales tax engine  
- Agent-first UX as primary  
- Replacing ERP  

### 8.6 Expansion verticals (ordered)

1. Unapplied credits via supplier statements  
2. Contract unit-price compliance (structured rate cards first, PDFs later)  
3. Sales & use tax overpay (rules engine + certs)  
4. Freight audit module  
5. Customs drawback / post-entry / program refunds  

---

## 9. System architecture (full)

### 9.1 Logical architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Clients / Ops UI                         │
│  Web app (analyst queue, claim detail, reports, admin)           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / SSO
┌────────────────────────────▼────────────────────────────────────┐
│                      API Gateway / BFF                            │
│  AuthZ, tenancy, rate limits, OpenAPI                             │
└───┬──────────────┬──────────────┬──────────────┬────────────────┘
    │              │              │              │
    ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Ingest  │  │ Detect   │  │ Claim    │  │ Collection   │
│ Service │  │ Service  │  │ Service  │  │ Service      │
└────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘
     │            │             │               │
     ▼            ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Platform services                            │
│  Identity │ Object/Evidence store │ Search │ Jobs │ Notify │ Audit│
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Data plane: OLTP (claims) + Object store + Optional lakehouse   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Money kernel module (Ledger Money or extracted package)         │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Architecture principles

1. **Claim is the aggregate root**, not Ledger entry.  
2. **Detectors are versioned pure-ish functions** over snapshots.  
3. **Side effects** (email, vendor portal) only after validated status.  
4. **Idempotent ingest** (content hash of source files + row natural keys).  
5. **Tenant isolation** at DB and object prefix.  
6. **Reproducibility:** re-run detector version N on snapshot S → same candidates.  
7. **Fail closed on money:** invalid decimal → reject row/claim.  
8. **Human gates are code**, not documentation.

### 9.3 Deployment topologies

| Topology | When |
|----------|------|
| Single-tenant VPC | Enterprise recovery firm / regulated client |
| Multi-tenant SaaS | Product company motion |
| Air-gapped / customer-cloud | Highest sensitivity ERP extracts |

MVP should support **single-tenant first** (simpler trust), design schema for multi-tenant from day one (`tenant_id` everywhere).

### 9.4 Suggested tech stack (reference; swappable)

| Layer | Reference choice | Notes |
|-------|------------------|-------|
| Language | TypeScript (Node 22+) | Aligns with Ledger; one money story |
| API | REST + OpenAPI; optional tRPC | Document all claim transitions |
| Web | React + strict form validation | Queue-centric UX |
| OLTP | PostgreSQL | Claims, users, mappings |
| Jobs | Queue (SQS/Rabbit/BullMQ) + workers | Ingest, detect, notify |
| Objects | S3-compatible | Evidence, source files |
| Search | Postgres FTS or OpenSearch | Claim/vendor search |
| Auth | OIDC SSO (Okta/AzureAD) + RBAC | Enterprise table stakes |
| Observability | OpenTelemetry + logs + metrics | Detector precision dashboards |
| Money | `@eternal-roman/ledger` Money or extract | No floats |
| IaC | Terraform | Reproducible envs |
| CI | build, typecheck, test, money invariant tests, migration tests | |

**Not required for MVP:** Kafka (unless volume demands), graph DB, blockchain.

### 9.5 Bounded contexts (DDD)

1. **Tenancy & Identity**  
2. **Ingestion & Canonical Documents**  
3. **Detection**  
4. **Claims**  
5. **Evidence**  
6. **Collection / Outreach**  
7. **Fees & Settlements**  
8. **Reporting**  
9. **Admin / Integrations**  

---

## 10. Domain model (complete)

### 10.1 Core entities

#### Tenant
- `id`, `name`, `status`, `settings` (thresholds, fee defaults), `created_at`

#### LegalEntity (client subsidiary)
- `id`, `tenant_id`, `name`, `currency_default`, `external_refs`

#### SourceSystem / Connection
- `id`, `type` (`csv_sftp` | `api` | `manual_upload`), config (secrets in vault), schedule

#### IngestBatch
- `id`, `tenant_id`, `connection_id`, `received_at`, `content_hash`, `row_counts`, `status` (`received|parsed|failed|published`)

#### CanonicalVendor
- `id`, `tenant_id`, `display_name`, `tax_ids[]`, `aliases[]`, `remit_addresses[]`

#### CanonicalInvoice
- `id`, `tenant_id`, `vendor_id`, `invoice_number_raw`, `invoice_number_norm`, `invoice_date`, `due_date`, `currency`, `gross_amount` (Money), `tax_amount`, `net_amount`, `po_numbers[]`, `source_refs[]`, `line_items[]?`

#### CanonicalPayment
- `id`, `tenant_id`, `vendor_id?`, `paid_at`, `currency`, `amount` (Money), `method`, `payment_ref`, `invoice_links[]` (resolved or raw), `source_refs[]`

#### CanonicalPurchaseOrder
- `id`, `tenant_id`, `po_number`, `vendor_id`, `lines[]` (`sku`, `qty`, `unit_price` Money, `currency`)

#### CanonicalCreditMemo / StatementOpenItem (phase 1.5+)
- As needed for credits vertical

#### DetectorRun
- `id`, `tenant_id`, `detector_id`, `detector_version`, `config_version`, `input_snapshot_id`, `started_at`, `completed_at`, `status`, `stats`

#### Claim (aggregate root)
- `id`, `tenant_id`, `legal_entity_id`
- `detector_id`, `detector_version`, `detector_run_id`
- `status` (see lifecycle)
- `vendor_id`
- `currency`
- `paid_amount` (Money)
- `entitled_amount` (Money)
- `claim_amount` (Money) — typically `paid − entitled` (policy-documented)
- `confidence` (0–1 decimal string or basis points integer — **not binary float surprise**; prefer integer basis points)
- `summary`, `rationale_structured` (JSON: features, matched keys)
- `evidence_ids[]`
- `version` / `content_hash`
- `assignee_id?`, `due_at?`
- `external_refs` (client ticket numbers)
- `created_at`, `updated_at`

#### ClaimTransition
- `id`, `claim_id`, `from_status`, `to_status`, `actor_id`, `actor_type` (`user|system|policy`), `reason`, `at`, `metadata`

#### EvidenceObject
- `id`, `tenant_id`, `kind` (`source_row|pdf|email|screenshot|statement|contract_clause|bank_proof`)
- `content_hash`, `storage_uri`, `captured_at`, `pii_class`

#### OutreachCase
- `id`, `claim_ids[]`, `vendor_id`, `channel`, `status`, `thread_refs[]`

#### RecoveryEvent
- `id`, `claim_id`, `recovered_amount` (Money), `recovered_at`, `form` (`ach|check|credit_memo|netted`), `proof_evidence_id`, `notes`

#### FeeAssessment
- `id`, `tenant_id`, `claim_id` or `settlement_id`
- `recovered_amount`, `fee_rate` (exact decimal string), `fee_amount`, `rounding_policy`, `status`

#### Money type representation (storage)

Store as:

```json
{ "a": "1234.56", "c": "USD", "s": 2 }
```

Never store IEEE float for amounts. Application layer constructs kernel Money on read/write validation.

### 10.2 Claim lifecycle state machine

```text
candidate
  → under_review
  → validated
  → submitted
  → disputed
  → partially_recovered
  → recovered
  → written_off
  → rejected          (invalid finding)
  → withdrawn         (client/vendor relationship decision)
```

**Allowed transitions (normative):**

| From | To | Gate |
|------|----|------|
| candidate | under_review | assign or open |
| candidate | rejected | reason required |
| under_review | validated | evidence complete + amount > 0 + policy |
| under_review | rejected | reason |
| validated | submitted | export pack generated |
| submitted | disputed | note |
| submitted / disputed | partially_recovered | RecoveryEvent sum < claim |
| submitted / disputed / partially_recovered | recovered | RecoveryEvent sum ≥ policy threshold (default = claim or agreed settlement) |
| * | written_off | lead role |
| validated | withdrawn | lead role |

**Invariant:** `claim_amount`, `paid_amount`, `entitled_amount` currency match; `claim_amount` recomputed from policy function and must match stored value on validate.

### 10.3 Detector interface (normative)

```ts
interface DetectorContext {
  tenantId: string;
  snapshotId: string;
  asOf: string; // explicit ISO date, no wall-clock default in reproducible runs
  config: DetectorConfig;
}

interface DetectorCandidate {
  detectorId: string;
  detectorVersion: string;
  vendorId?: string;
  currency: string;
  paidAmount: MoneyJSON;
  entitledAmount: MoneyJSON;
  claimAmount: MoneyJSON;
  confidenceBps: number; // 0..10000
  featureVector: Record<string, string | number | boolean>;
  evidenceHints: EvidenceHint[];
  rationale: string; // human-readable, not sole authority
}

interface Detector {
  id: string;
  version: string;
  run(ctx: DetectorContext): Promise<DetectorCandidate[]>;
}
```

### 10.4 MVP detectors (spec)

#### D1 `dup_exact` v1

**Inputs:** payments joined to invoices where possible; else payments alone.

**Match key (example):**  
`norm(vendor_id) + norm(invoice_number) + amount + currency`  
or payment natural key collisions.

**Entitled:** one payment entitled; extras claimable.  
**Confidence:** 9500–9900 bps when keys exact.  
**Evidence:** both payment rows, invoice rows, source file refs.

#### D2 `dup_near` v1

**Features:** fuzzy invoice number (edit distance), same vendor, amount equal, paid_at within N days, same currency.

**Confidence:** function of distance + temporal proximity.  
**Gate:** never auto if confidence < threshold; default human.

#### D3 `po_overpay_simple` v1

**Inputs:** invoice lines + PO lines matched by po_number + line sku/description heuristic.  
**Entitled:** `po_unit_price * qty` (and tax policy explicit).  
**Claim:** max(0, paid − entitled).  
**Gate:** human if match fuzzy; auto only if exact SKU match config enabled.

---

## 11. Technical components (every piece)

### 11.1 Identity & access

**Components:**

- OIDC login  
- RBAC roles: `admin`, `data_manager`, `analyst`, `lead`, `viewer`, `collector`  
- ABAC optional later: per legal entity  
- API keys for connectors (scoped, rotatable)  
- Session audit  

**Permissions matrix (minimum):**

| Action | viewer | analyst | lead | data_manager | admin |
|--------|--------|---------|------|--------------|-------|
| View claims | Y | Y | Y | Y | Y |
| Validate/reject | | Y | Y | | Y |
| Dual control second approve | | | Y | | Y |
| Submit outreach | | Y* | Y | | Y |
| Manage connectors | | | | Y | Y |
| Tenant settings / thresholds | | | Y | | Y |

\*submit may require lead if above threshold.

### 11.2 Ingestion subsystem

**Components:**

1. **Upload API** — multipart to object store; create `IngestBatch`.  
2. **SFTP landing** — scheduled pull worker.  
3. **Parsers** — CSV/Excel profiles per client mapping.  
4. **Mapping DSL** — field map config (JSON): source column → canonical field + transform.  
5. **Validation** — required fields, Money parse, date ISO, currency codes.  
6. **Quarantine** — bad rows to error table with reasons.  
7. **Publish** — upsert canonical docs with idempotent keys.  
8. **Lineage** — every canonical row stores `source_batch_id`, `source_row_num`, `source_content_hash`.

**Idempotency keys (examples):**

- Invoice: `tenant + vendor_norm + invoice_number_norm + invoice_date + gross_amount + currency`  
- Payment: `tenant + payment_ref + paid_at + amount + currency` (fallback composite)

**Data quality report:** % parse fail, null vendors, amount outliers, duplicate natural keys within file.

### 11.3 Entity resolution

**Components:**

- Vendor normalization (legal suffixes, case, punctuation)  
- Alias table (manual + suggested)  
- Optional tax ID match  
- Merge UI for analysts (`same_as`)  
- Never silent merge above risk score without approval  

### 11.4 Snapshotting for reproducibility

Before detector run:

- Freeze set of canonical document IDs + versions included (`InputSnapshot`).  
- Store detector config JSON.  
- Run detectors against snapshot only.  

Enables: dispute defense (“as of this data, detector vX produced claim”).

### 11.5 Detection workers

**Components:**

- Job scheduler (manual + cron)  
- Worker pool per detector  
- Candidate writer → Claim service (`status=candidate`) with dedupe (`detector + fingerprint`)  
- Metrics: candidates, auto-validated, error rate  
- Shadow mode: run new detector version without creating claims  

**Fingerprint example:**  
`sha256(detector_id + vendor_id + sorted(payment_ids) + claim_amount + currency)`

### 11.6 Claim service

**Components:**

- CRUD + state machine enforcement  
- Optimistic locking on `version`  
- Content hash over canonical claim payload  
- Assignment / bulk actions  
- Comments / @mentions  
- Link to detector features JSON  
- Recompute amount endpoint (policy function)

### 11.7 Evidence service

**Components:**

- Store blobs (encrypted at rest)  
- Metadata index  
- Automatic attachments from ingest lineage  
- Manual upload  
- Redaction workflow (future)  
- Evidence completeness checker per detector requirements  

### 11.8 Collection / outreach service

**MVP:**

- Generate **claim package** (PDF/ZIP): summary, amounts, supporting extracts  
- Email draft templates (send via human copy-paste or SMTP integration)  
- Status tracking on outreach  

**Later:**

- Vendor portal integrations  
- Sequence cadences  
- Dispute reason codes  
- Partial settlement allocator (apply recovery across claims exactly)

### 11.9 Fee & settlement service

**Components:**

- Fee policy per tenant/contract (`rate`, `cap`, `min`, `included detectors`)  
- On `RecoveryEvent`, compute `FeeAssessment` with Money  
- Settlement batches (monthly invoice to client for contingency)  
- Optional double-entry export:

```text
Dr Accounts Receivable — Client Fee
   Cr Recovery Fee Revenue
```

(using Ledger journal APIs if desired)

### 11.10 Reporting

**Dashboards:**

- Pipeline funnel by status  
- $ candidate / validated / submitted / recovered  
- Precision estimates (recovered / validated)  
- Analyst productivity  
- Detector performance leaderboard  
- Aging of open claims  

**Exports:** CSV/PARQUET for client  

### 11.11 Notification

- Email/Slack when assigned  
- SLA breach for aging claims  
- Ingest failure alerts  

### 11.12 Admin & settings

- Thresholds (`auto_threshold_bps`, `auto_max_amount`, `dual_control_threshold`)  
- Detector enablement  
- Retention policies  
- SSO config  
- Audit log viewer  

### 11.13 Money kernel integration module

**Module responsibilities:**

- Parse/validate amounts on boundaries  
- Arithmetic for claim_amount and fees  
- Optional hash of claim package  
- Optional internal GL for firm  

**Anti-corruption layer:**  
Domain uses `MoneyJSON`; only kernel module constructs Money.

### 11.14 Optional AI components (constrained)

Allowed:

- OCR / document classification for statements and contracts  
- Fuzzy feature suggestion  
- Draft outreach language  
- Mapping recommendation for new CSV headers  

Forbidden without deterministic verification:

- Sole determination of `entitled_amount`  
- Auto-submit to vendor  
- Silent confidence inflation  

Every AI output stored as **suggestion artifact**, not claim truth.

### 11.15 Security & compliance components

- Encryption at rest + in transit  
- Secret manager for connector credentials  
- SOC2-oriented controls: access reviews, logging, change management  
- PII classification on evidence  
- Tenant data residency options  
- Backup / restore drills  
- Penetration test before multi-tenant GA  
- Supply-chain: lockfiles, dependabot minors (majors planned)  

### 11.16 Observability

- Trace ingest → detect → claim transitions  
- Business metrics as first-class  
- Detector drift alerts (precision drop)  

---

## 12. APIs (normative outline)

### 12.1 Claim API

- `POST /v1/detector-runs`  
- `GET /v1/claims?status=&assignee=&minAmount=&detector=`  
- `GET /v1/claims/{id}`  
- `POST /v1/claims/{id}/transition` body: `{ toStatus, reason }`  
- `POST /v1/claims/{id}/evidence`  
- `POST /v1/claims/{id}/recovery-events`  
- `GET /v1/claims/{id}/package` → zip  

### 12.2 Ingest API

- `POST /v1/ingest/upload`  
- `GET /v1/ingest/batches/{id}`  
- `POST /v1/mappings`  
- `GET /v1/data-quality/{batchId}`  

### 12.3 Admin API

- thresholds, users, roles, detectors  

All money fields: string decimals + currency. All times: ISO-8601 UTC. All IDs: ULID/UUID.

---

## 13. UI surfaces (complete MVP)

1. **Login / SSO**  
2. **Home dashboard** — funnel + my queue count  
3. **Ingest** — upload, mapping editor, quality  
4. **Queue** — filterable claim list, bulk assign  
5. **Claim detail** — amounts, features, evidence, timeline, actions  
6. **Vendor page** — all claims for vendor  
7. **Outreach** — package download, status  
8. **Recoveries & fees** — events, fee table  
9. **Admin** — thresholds, users, detectors  
10. **Audit log**  

UX law: primary CTA on claim detail is **Validate** or **Reject**, never “File all.”

---

## 14. Data platform details

### 14.1 OLTP schema notes

- Every table: `tenant_id`, indexes on `(tenant_id, status)`, `(tenant_id, vendor_id)`  
- Amounts: `NUMERIC` or string + check constraints; prefer **string + app Money validation** or `NUMERIC` with scale enforcement  
- Soft deletes avoided for claims; use status  
- Partition claim_transitions by time if volume high  

### 14.2 Object storage layout

```text
s3://rce/{tenant_id}/ingest/{batch_id}/raw/...
s3://rce/{tenant_id}/evidence/{evidence_id}/...
s3://rce/{tenant_id}/packages/{claim_id}/{version}.zip
```

### 14.3 Retention

- Source files: per contract (e.g. 7 years for financial)  
- Claims: life of tenant + legal hold flag  
- Secrets: rotate 90 days  

---

## 15. Implementation plan (phased, unabridged)

### Phase 0 — Decisions & foundations (1–2 weeks)

**Deliverables:**

- [ ] Product decision record: MVP vertical = AP duplicates  
- [ ] Deploy topology choice  
- [ ] Money library decision (Ledger dependency vs extract)  
- [ ] Threat model draft  
- [ ] Empty monorepo or `services/rce` workspace layout  
- [ ] CI skeleton  

**Exit:** written ADR set.

### Phase 1 — Platform spine (2–4 weeks)

**Deliverables:**

- [ ] Tenancy + Identity + RBAC  
- [ ] Postgres migrations  
- [ ] Object store integration  
- [ ] Claim state machine + transitions API  
- [ ] Evidence upload  
- [ ] Audit log  
- [ ] Money module boundary tests (no floats)  
- [ ] Minimal web: login + claim list + detail + transition  

**Exit:** can manually create a claim and move through statuses with evidence; all amounts exact.

### Phase 2 — Ingest MVP (2–4 weeks)

**Deliverables:**

- [ ] CSV upload for invoices + payments  
- [ ] Mapping config  
- [ ] Canonical upsert + idempotency  
- [ ] Quarantine + data quality report  
- [ ] Vendor normalization v1  

**Exit:** real sample client files land as canonical rows reproducibly.

### Phase 3 — Detectors MVP (2–4 weeks)

**Deliverables:**

- [ ] InputSnapshot  
- [ ] `dup_exact` + tests with golden cases  
- [ ] `dup_near` + tests  
- [ ] Optional `po_overpay_simple`  
- [ ] DetectorRun job  
- [ ] Candidate → Claim creation with fingerprint dedupe  
- [ ] Confidence + policy auto-validate path (strict allowlist)  

**Exit:** known fixture set produces exact expected claims; re-run stable.

### Phase 4 — Analyst UX polish (2–3 weeks)

**Deliverables:**

- [ ] Queue filters, assignment, bulk reject  
- [ ] Feature explanation panel  
- [ ] Evidence completeness checklist  
- [ ] Dual control workflow  
- [ ] Package ZIP export  

**Exit:** analyst can process 50 fixture claims without engineering help.

### Phase 5 — Recovery & fees (1–2 weeks)

**Deliverables:**

- [ ] RecoveryEvent API/UI  
- [ ] FeeAssessment exact math + tests  
- [ ] Recovered/partial states  
- [ ] Basic reporting dashboard  

**Exit:** contingency fee on recovered amount matches hand-calculated fixtures.

### Phase 6 — Hardening (2–4 weeks)

**Deliverables:**

- [ ] SSO  
- [ ] Load test ingest  
- [ ] Security review  
- [ ] Backup/restore  
- [ ] Runbooks  
- [ ] Detector precision dashboard  
- [ ] Customer pilot playbook  

**Exit:** pilot-ready.

### Phase 7 — Vertical expansion (ongoing)

Order per §8.6; each vertical = new detectors + evidence requirements + optional specialist UI + policy matrix updates. **Do not start customs until Phase 6 exit.**

### Phase 8 — Optional Ledger-deep integration

- [ ] Fee journals via Ledger  
- [ ] MCP tools for claim amounts (not autonomous filing)  
- [ ] Hash claim packages with kernel-style length-prefixed hashing  

---

## 16. Testing strategy (complete)

### 16.1 Test layers

| Layer | Content |
|-------|---------|
| Unit | Money boundaries, state machine, fee rounding, normalize invoice numbers |
| Detector golden | Fixed CSVs → exact candidate set + amounts |
| Property | claim_amount >= 0; currency consistent; transitions legal |
| API contract | OpenAPI e2e |
| Security | tenant isolation tests (no cross-tenant read) |
| Replay | snapshot + detector version → identical claims |
| Load | ingest 1–10M payment rows (target as capacity goal) |
| UX | critical path scripts |

### 16.2 Forbidden regressions

- Float in amount path  
- Auto-submit without validated  
- Cross-tenant evidence read  
- Non-deterministic detector given same snapshot  

### 16.3 Pilot evaluation protocol

1. Historical AP extract (12–24 months).  
2. Run detectors.  
3. Human validate sample stratified by confidence.  
4. Measure precision; tune thresholds.  
5. Only then enable auto-validate allowlist.  
6. Track actual recoveries over 90 days.

---

## 17. Risks, ethics, and open decisions

### 17.1 Risks

| Risk | Mitigation |
|------|------------|
| False positives damage vendors | Strict gates; professional outreach; easy withdraw |
| Clients expect full autonomy | Sales narrative: force-multiplier |
| Data sensitivity | Single-tenant option; encryption; SOC2 path |
| Scope creep into “full ERP” | MVP charter enforcement |
| Customs legal complexity | Delay vertical; partner specialists |
| Detector gaming / adversarial invoices | Fingerprints, multi-feature near-dup |
| Contingency fee disputes | Exact fee math + recovery proofs |
| Over-reliance on LLM | Suggestion-only policy |

### 17.2 Ethical / professional

- Do not file speculative claims to inflate contingency.  
- Prefer client long-term controls over one-time harvest where aligned.  
- Transparent methodology to client.  
- Disclaimer: not legal/tax advice; specialists for tax/customs filings.

### 17.3 Open decisions (must resolve before build)

1. Greenfield repo vs monorepo under ledger?  
2. Multi-tenant SaaS vs services OS first?  
3. Extract Money package from Ledger?  
4. Auto-validate enabled at pilot day 1? (recommend **off**)  
5. Who performs collection — client, vendor tool, or managed service?  
6. Pricing of software vs contingency share for the product company?

---

## 18. Tethers for researchers and implementers

### 18.1 In-repo anchors (Ledger)

| Path | Relevance |
|------|-----------|
| `AGENTS.md` / `docs/CORE-PROTOCOL.md` | Money invariants, no floats |
| `src/core/money.ts` | Exact decimal Money |
| `src/core/ledger.ts` | auditHash, apply, equation |
| `src/reconcile/reconcile.ts` | Only toy position reconcile — **not** AP recovery |
| `mcp/` | Agent tools pattern (optional later) |
| `docs/SCOPE-AND-LAYERS.md` | Honest scope of current package |
| `docs/roadmap.md` | Prior reduction philosophy |
| This file | Full RCE plan |

### 18.2 External research tethers (re-verify on reconnect)

Industry / process (examples used in originating research; re-fetch for freshness):

- AP recovery guides and fee ranges (contingency ~10–40%, often 20–30%): apexanalytix, PRGX AP recovery guide, flextecs recovery auditing explainers.  
- Process stages / assets reviewed: PRGX “Ultimate Guide to AP Recovery Audits”; data transformation posts on statements + contracts.  
- Market size citations: industry guides referencing Research and Markets-style AP recovery audit service market figures.  
- Customs / tariff reclaim: CBP ACE/CAPE and duty refund program pages; drawback overview (19 CFR 190); trade advisory firm explainers (Baker Tilly, Aprio, etc.).  
- Medicare RAC contingency history: CMS/CRS materials (regulated analogue of contingency recovery).  

**Researcher task on reconnect:** update fee ranges, portal procedures, and legal program status; do not assume 2026-07 snapshots eternal.

### 18.3 Glossary

| Term | Meaning |
|------|---------|
| RCE | Recovery Claim Engine (this product) |
| Claim | Reclaimable delta with evidence and lifecycle |
| Detector | Versioned finder producing candidates |
| Entitled amount | What should have been paid under policy/contract |
| Contingency fee | % of recovered cash paid to recovery party |
| Snapshot | Frozen inputs for reproducible detection |
| Dual control | Two-person approval for high-value actions |

### 18.4 One-page architecture checksum

If an agent can answer these, it has reconnected:

1. What is the aggregate root? → **Claim**  
2. What is success? → **Recovered cash with defensible evidence**, not balanced GL  
3. What is MVP detector set? → **dup_exact, dup_near, optional po_overpay_simple**  
4. What is product law on autonomy? → **Propose/validate; humans or strict policy accept**  
5. What does Ledger provide? → **Exact money (and optional journals/hashes)**  
6. What is out of MVP? → **Customs, full contract NLP, freight, tax engine**  

---

## 19. Work breakdown structure (WBS) — complete component list

Use this as implementation inventory; each item should become tickets when authorized.

### 19.1 Product & design

- [ ] PRD from this plan (short)  
- [ ] ADR: topology, money lib, vertical  
- [ ] UX wireframes for queue + claim detail  
- [ ] Policy matrix finalized with numbers  
- [ ] Pilot customer success criteria  

### 19.2 Platform

- [ ] Repo layout / monorepo  
- [ ] CI/CD  
- [ ] Environments (dev/stage/prod)  
- [ ] Postgres + migrations framework  
- [ ] Object storage  
- [ ] Secrets manager  
- [ ] Observability stack  
- [ ] Feature flags  

### 19.3 Security

- [ ] Threat model  
- [ ] SSO  
- [ ] RBAC enforcement tests  
- [ ] Tenant isolation tests  
- [ ] Encryption  
- [ ] Audit log completeness  

### 19.4 Ingest

- [ ] Upload  
- [ ] SFTP  
- [ ] CSV parser  
- [ ] Mapping DSL  
- [ ] Validation  
- [ ] Quarantine  
- [ ] Canonical vendors/invoices/payments/POs  
- [ ] Idempotency  
- [ ] DQ report  

### 19.5 Detection

- [ ] Snapshot service  
- [ ] Detector SDK  
- [ ] dup_exact  
- [ ] dup_near  
- [ ] po_overpay_simple  
- [ ] Fingerprint dedupe  
- [ ] Shadow runs  
- [ ] Metrics  

### 19.6 Claims

- [ ] State machine  
- [ ] Transitions API  
- [ ] Content hash  
- [ ] Assignment  
- [ ] Comments  
- [ ] Bulk actions  

### 19.7 Evidence & packages

- [ ] Evidence store  
- [ ] Completeness rules  
- [ ] Package builder  

### 19.8 Collection

- [ ] Outreach case  
- [ ] Templates  
- [ ] Status tracking  
- [ ] (Later) integrations  

### 19.9 Fees

- [ ] Fee policy  
- [ ] Assessment on recovery  
- [ ] Settlement batching  
- [ ] Optional GL export  

### 19.10 UI

- [ ] All screens in §13  

### 19.11 Reporting

- [ ] Funnel  
- [ ] Detector quality  
- [ ] Fee reports  
- [ ] Export  

### 19.12 Docs & ops

- [ ] Runbooks (ingest fail, detector fail, dual control)  
- [ ] Pilot playbook  
- [ ] Client data handling agreement template  
- [ ] Support playbook  

### 19.13 Expansion modules (backlog)

- [ ] Statement credits detector  
- [ ] Contract rate card detector  
- [ ] Tax module  
- [ ] Freight module  
- [ ] Customs module (ACE, HTS, drawback)  
- [ ] Continuous real-time pre-payment prevention mode  

---

## 20. Recommended near-term decision (for humans)

If revisiting with limited resources:

1. **Do not** broaden Ledger into recovery theater via more MCP tools.  
2. **Do** authorize Phase 0–3 of RCE as a focused product (or skunkworks repo).  
3. **Keep** Ledger as exact-money dependency and general kernel for other uses.  
4. **Staff** at least one recovery-domain advisor (ex-AP recovery analyst) for detector acceptance criteria — pure eng will optimize the wrong precision.

---

## 21. Document control

| Field | Value |
|-------|--------|
| Title | Recovery Claim Engine — Complete Reference Plan |
| ID | RCE-PLAN-2026-07-10 |
| Location | `docs/plans/2026-07-10-recovery-claim-engine-reference-plan.md` |
| Git | **Do not require commit**; may remain local/uncommitted per author instruction |
| Supersedes | None |
| Review cadence | On reconnect: re-validate §4 fees/process and §18.2 sources |

### 21.1 Change log

| Date | Change |
|------|--------|
| 2026-07-10 | Initial unabridged reference plan from research + Ledger reality + trust/labor analysis |

---

## 22. Final checksum for future agents

**Build this if:** you want a trustable reclaim product that makes money from recovered cash workflows.  
**Do not build this if:** you only wanted a better double-entry kernel demo.  
**Never claim:** full automation of recovery audit without human validation and collection.  
**Always keep:** exact money, claim lifecycle, evidence, reproducibility, narrow vertical excellence first.

*End of reference plan.*
