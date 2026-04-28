# Compliance Intelligence MCP Server

> **[View on Apify](https://apify.com)** | **[Use on Apify Store](https://apify.com)**

SEC EDGAR compliance intelligence for AI agents — no API key needed, direct MCP integration for AML, KYC, and sanctions screening workflows.

---

## Quick Start

Add to your MCP client:

```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

AI agents can now screen entities against SEC enforcement data, retrieve company filings, and access regulatory intelligence for compliance due diligence.

---

## What is Compliance Intelligence MCP?

**Compliance Intelligence MCP** is a Model Context Protocol (MCP) server that gives AI agents instant access to SEC EDGAR regulatory data for compliance, due diligence, and sanctions screening workflows.

The server provides three core tools:

| Tool | Price | Description |
|------|-------|-------------|
| `screen_entity` | $0.08 | Screen company/person against SEC enforcement actions, get composite risk score |
| `get_company_filings` | $0.05 | Retrieve company SEC filings (10-K, 8-K, DEF 14A, etc.) |
| `get_company_info` | $0.05 | Get company registration info: CIK, state of incorporation, SIC description |

This MCP is built for **compliance teams, AML/KYC analysts, and AI agents** performing regulatory due diligence on companies and counterparties. It bridges the gap between raw SEC EDGAR data and actionable compliance intelligence by providing pre-scored risk assessments, entity resolution, and structured filing data — without requiring an API key or manual database access.

---

## Why use Compliance Intelligence MCP?

**The problem:** SEC EDGAR is the authoritative source for US securities enforcement data, company filings, and regulatory actions. However, accessing this data manually requires navigating the SEC's dense interface, understanding EDGAR's CIK-based indexing system, and parsing poorly structured filings. For AML/KYC compliance teams and AI agents performing sanctions screening, this manual research is time-consuming, error-prone, and doesn't scale.

**The solution:** Compliance Intelligence MCP provides AI-native access to SEC EDGAR through three carefully designed tools. An AI agent can call `screen_entity` to get an instant risk score and enforcement history for any company or person — no API key required, no manual SEC website navigation. The data is pre-structured for compliance workflows: composite risk scores (0-100), enforcement action counts, related party information, and human-readable verdicts.

### Key benefits:

- **Instant sanctions screening** — Query SEC enforcement data to identify companies or individuals with regulatory violations, litigation releases, or enforcement actions on record
- **Company due diligence** — Retrieve full SEC filing histories including annual reports (10-K), current events (8-K), and proxy statements (DEF 14A)
- **Entity verification** — Resolve company names to SEC CIK identifiers, verify state of incorporation, and cross-reference SIC codes
- **AML/KYC compliance** — Integrate SEC regulatory data into broader AML and KYC screening workflows as one authoritative data source
- **No API key needed** — AI agents connect directly via MCP protocol without SEC API registration or approval
- **OFAC sanctions context** — While this MCP focuses on SEC EDGAR data, it complements OFAC sanctions screening by providing regulatory enforcement context that OFAC lists alone don't capture

---

## How to connect Compliance Intelligence MCP to your AI client

### Prerequisites

- An Apify account (free to start)
- An AI client with MCP support (Claude Desktop, Cursor, Windsurf, or any MCP-compatible agent)

### Step 1: Add to your MCP configuration

**Claude Desktop:**
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

**Cursor:**
Add to Cursor MCP settings:
```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

**Windsurf:**
Add to Windsurf MCP configuration:
```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

**Other MCP clients:**
```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

### Step 2: Start querying

Once configured, your AI agent can call compliance tools directly:

```
AI agent: "Screen Apple Inc. for SEC enforcement actions"
MCP call: screen_entity({ company_name: "Apple Inc." })
Returns: risk_score, enforcement_actions_count, related_parties, verdict

AI agent: "Get the latest 10-K and 8-K filings for Goldman Sachs"
MCP call: get_company_filings({ company_name: "Goldman Sachs", form_type: "10-K" })
Returns: filings list with accession numbers, dates, document URLs

AI agent: "Look up SEC registration info for Tesla"
MCP call: get_company_info({ company_name: "Tesla" })
Returns: company_name, cik, sic_description, state_of_incorporation
```

---

## MCP Tools Reference

### screen_entity

**Purpose:** Screen a company or individual against SEC EDGAR for enforcement actions and regulatory risk.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_name` | string | No* | Company name to screen (e.g., "Goldman Sachs", "Enron Corp.") |
| `cik` | string | No* | SEC Central Index Key — alternative to company_name |

*Either `company_name` or `cik` is required.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | Screened entity name or CIK |
| `cik` | string | SEC CIK if resolved |
| `risk_score` | number | Composite risk score 0-100 (higher = cleaner) |
| `risk_level` | string | LOW (80+), MEDIUM (60-79), HIGH (40-59), CRITICAL (<40) |
| `enforcement_actions_count` | integer | Number of SEC enforcement actions found |
| `litigation_releases_count` | integer | Number of litigation releases found |
| `risk_signals` | object | Individual signal breakdowns |
| `related_parties` | array | Key principals and associated entities |
| `verdict` | string | Human-readable compliance assessment |
| `sources` | array | Data sources queried (SEC EDGAR) |

**When to call:** Before engaging with a new counterparty, during KYC onboarding, or when OFAC sanctions screening requires supplementary SEC regulatory context.

**Example AI prompt:** "Screen Tesla for SEC enforcement actions and tell me its compliance risk level."

---

### get_company_filings

**Purpose:** Retrieve SEC EDGAR filings for a company including annual reports, current events, and proxy statements.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_name` | string | No* | Company name to search |
| `cik` | string | No* | SEC CIK number |
| `form_type` | string | No | Filter by form type (10-K, 8-K, 10-Q, DEF 14A) |
| `date_from` | string | No | Start date YYYY-MM-DD |
| `date_to` | string | No | End date YYYY-MM-DD |
| `max_results` | integer | No | Maximum results (default: 20) |

*Either `company_name` or `cik` is required.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | Company name or CIK queried |
| `cik` | string | SEC CIK |
| `company_name` | string | Resolved company name |
| `total_filings` | integer | Total filings matching query |
| `filings` | array | List of filing records with accession number, form type, filing date, document URL |
| `source` | string | Data source (SEC EDGAR) |

**When to call:** During due diligence research, when verifying regulatory filings as part of compliance review, or when cross-referencing SEC submissions for AML/KYC purposes.

**Example AI prompt:** "Get the last 20 8-K filings for JPMorgan Chase and show me the filing dates and descriptions."

---

### get_company_info

**Purpose:** Get basic company registration information from SEC EDGAR.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_name` | string | No* | Company name to look up |
| `cik` | string | No* | SEC CIK number |

*Either `company_name` or `cik` is required.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `company_name` | string | Registered company name |
| `cik` | string | SEC Central Index Key |
| `sic_code` | string | Standard Industrial Classification code |
| `sic_description` | string | Human-readable SIC code description |
| `state_of_incorporation` | string | State where company is incorporated |
| `fiscal_year_end` | string | Fiscal year end month/day |
| `mailing_address` | object | Company mailing address |
| `business_address` | object | Company business address |
| `filings_count` | integer | Total number of recent SEC filings |
| `source` | string | Data source (SEC EDGAR) |

**When to call:** When verifying company identity during KYC onboarding, resolving ambiguous company names, or cross-referencing SEC registration data with other compliance databases.

**Example AI prompt:** "Look up SEC registration info for Microsoft including their state of incorporation and SIC code."

---

## Use cases for compliance intelligence

### AML/KYC Due Diligence
*Persona: Compliance officer at a financial institution conducting KYC review*

```
AI agent: "Screen the target of our acquisition — 'Palantir Technologies' — for SEC enforcement history"
MCP call: screen_entity({ company_name: "Palantir Technologies" })
Returns: risk_score, enforcement_actions_count, risk_level, verdict

AI agent: "Check if Palantir has any AAER (Accounting and Auditing Enforcement Releases) on record"
MCP call: get_company_filings({ company_name: "Palantir Technologies", form_type: "AAER" })
Returns: AAER filings list with dates and descriptions
```

AML/KYC workflows require cross-referencing multiple regulatory sources. SEC enforcement data is a critical component — a company with prior SEC enforcement actions presents elevated compliance risk. The `screen_entity` tool provides an instant composite score that compliance officers can use to prioritize further due diligence.

### Sanctions Screening Enhancement
*Persona: BSA/AML analyst enhancing OFAC sanctions screening with regulatory context*

```
AI agent: "Screen 'Wirecard AG' for SEC enforcement and get their full SEC filing history"
MCP call: screen_entity({ company_name: "Wirecard AG" })
MCP call: get_company_filings({ company_name: "Wirecard AG" })
```

OFAC sanctions screening identifies parties on restricted lists, but it doesn't capture regulatory enforcement history. Combining OFAC checks with SEC EDGAR data through the `screen_entity` tool gives compliance teams a more complete picture of counterparty risk. A company with significant SEC enforcement history may warrant enhanced due diligence even if it's not on an OFAC sanctions list.

### Pre-Transaction Compliance Review
*Persona: Investment banker preparing for M&A transaction compliance review*

```
AI agent: "Get 10-K and 8-K filings for 'WeWork' in the last 24 months"
MCP call: get_company_filings({ company_name: "WeWork", form_type: "10-K", date_from: "2023-01-01" })
Returns: list of annual reports with filing dates and accession numbers

AI agent: "Look up WeWork's SEC registration to verify state of incorporation"
MCP call: get_company_info({ company_name: "WeWork" })
Returns: company info including state of incorporation and SIC code
```

Before executing M&A transactions, compliance teams verify the target company's regulatory standing. SEC filings provide insight into the company's financial health and regulatory compliance, while `get_company_info` confirms the entity's legal registration details.

### Hedge Fund Regulatory Due Diligence
*Persona: Compliance team at a hedge fund conducting vendor due diligence*

```
AI agent: "Screen 'Archegos Capital Management' for SEC enforcement actions"
MCP call: screen_entity({ company_name: "Archegos Capital Management" })
Returns: risk_score, enforcement_actions_count, risk_level, verdict

AI agent: "Get the 13-F filings for a fund we want to invest in"
MCP call: get_company_filings({ company_name: "Tiger Global Management", form_type: "13-F" })
Returns: 13-F filings showing portfolio holdings
```

Hedge funds must conduct due diligence on counterparties, service providers, and investment targets. SEC enforcement data provides an additional layer of risk assessment beyond standard background checks.

### Corporate Compliance Monitoring
*Persona: In-house compliance counsel monitoring regulatory status*

```
AI agent: "Get all 8-K filings for 'Coinbase' in the past 12 months"
MCP call: get_company_filings({ company_name: "Coinbase", form_type: "8-K", date_from: "2025-01-01" })
Returns: current event filings showing material corporate developments

AI agent: "Look up Coinbase's SEC registration and verify state of incorporation"
MCP call: get_company_info({ company_name: "Coinbase" })
Returns: company info including state of incorporation (likely Delaware), SIC code
```

Public companies file 8-K reports for material events — regulatory actions, leadership changes, financial results. Monitoring these filings helps compliance teams stay ahead of regulatory issues affecting their clients or investments.

---

## Output example

### screen_entity output

```json
{
  "status": "success",
  "result": {
    "entity": "Goldman Sachs",
    "cik": "0000886977",
    "risk_score": 95,
    "risk_level": "LOW",
    "enforcement_actions_count": 0,
    "litigation_releases_count": 3,
    "risk_signals": {
      "enforcement_trail": { "level": "CLEAN", "label": "No SEC enforcement actions found" },
      "litigation_references": { "level": "INFO", "label": "3 total SEC filings found" },
      "regulatory_flags": { "level": "NONE", "label": "No regulatory flags detected" }
    },
    "related_parties": [
      { "name": "Goldman Sachs", "role": "Reporting Company" }
    ],
    "verdict": "Clean SEC regulatory record with 0 enforcement action(s) found. Entity has no major sanctions history.",
    "sources": ["SEC EDGAR Full-Text Search", "SEC Company Filings Database"]
  }
}
```

### get_company_filings output

```json
{
  "status": "success",
  "result": {
    "entity": "Apple Inc.",
    "cik": "0000320193",
    "company_name": "Apple Inc.",
    "total_filings": 20,
    "filings": [
      {
        "accession_number": "000032019323000106",
        "form_type": "10-K",
        "filing_date": "2023-01-01",
        "description": "10-K - Annual report",
        "document_url": "https://www.sec.gov/Archives/edgar/full-index/2023/10-K/000032019323000106.txt"
      },
      {
        "accession_number": "000032019322000031",
        "form_type": "8-K",
        "filing_date": "2022-11-15",
        "description": "8-K - Current report",
        "document_url": "https://www.sec.gov/Archives/edgar/full-index/2022/8-K/000032019322000031.txt"
      }
    ],
    "source": "SEC EDGAR"
  }
}
```

### get_company_info output

```json
{
  "status": "success",
  "result": {
    "company_name": "Apple Inc.",
    "cik": "0000320193",
    "sic_code": "3571",
    "sic_description": "Electronic Computers",
    "state_of_incorporation": "CA",
    "fiscal_year_end": "09-30",
    "mailing_address": {
      "street1": "ONE APPLE PARK WAY",
      "city": "CUPERTINO",
      "state": "CA",
      "zip": "95014"
    },
    "business_address": {
      "street1": "ONE APPLE PARK WAY",
      "city": "CUPERTINO",
      "state": "CA",
      "zip": "95014"
    },
    "filings_count": 286,
    "source": "SEC EDGAR"
  }
}
```

---

## How Compliance Intelligence MCP works

### Architecture overview

The MCP server runs in **standby mode** on Apify, listening for MCP protocol requests. When an AI agent calls a tool:

1. **Request parsing** — The MCP server receives the JSON-RPC request and extracts the tool name and parameters
2. **Entity resolution** — If a company name is provided, the server resolves it to a SEC CIK using the SEC EDGAR company search
3. **Data fetching** — The server queries SEC EDGAR APIs (company submissions, full-text search) in parallel for maximum speed
4. **Scoring and synthesis** — For `screen_entity`, the server applies a risk scoring algorithm and generates a human-readable verdict
5. **Charging** — Pay-per-event pricing is applied via Apify's Actor.charge() method
6. **Response formatting** — Results are returned as structured JSON matching the tool's output schema

### Data sources

| Source | Used for |
|--------|---------|
| SEC EDGAR Full-Text Search | Enforcement-related filings (AAER, ENF), entity search |
| SEC Company Submissions API | Company info, filing history, CIK resolution |
| SEC EDGAR Archives | Historical filing retrieval and document URLs |

### Risk scoring methodology

The `screen_entity` tool calculates a composite risk score (0-100) using:

- **Enforcement count** — Primary weight: each SEC enforcement action reduces score proportionally
- **Litigation releases** — Secondary weight: high litigation release counts indicate regulatory disputes
- **Filing frequency** — Entities with zero or very few SEC filings may be shell companies or inactive entities

Risk levels:
- **LOW (80-100):** Clean regulatory record, no enforcement history
- **MEDIUM (60-79):** Moderate enforcement history, recommend additional screening
- **HIGH (40-59):** Significant enforcement history, thorough due diligence required
- **CRITICAL (<40):** Major enforcement history, do not engage without senior approval

---

## How much does it cost?

**Pay-per-event (PPE) pricing — $0.05 to $0.08 per tool call.**

| Tool | Price |
|------|-------|
| `screen_entity` | $0.08 per call |
| `get_company_filings` | $0.05 per call |
| `get_company_info` | $0.05 per call |

No subscription. No monthly fee. Pay only when your AI agents use the tools.

For reference, manual SEC EDGAR research typically takes 15-30 minutes per entity. With Compliance Intelligence MCP, an AI agent can screen an entity, retrieve filings, and get company info in under a second — at a fraction of the cost of analyst time.

---

## Comparison to alternative compliance data sources

| Aspect | Compliance Intelligence MCP | Direct SEC EDGAR | Commercial Compliance Services |
|--------|------------------------------|------------------|-------------------------------|
| Access method | MCP (AI-native) | Manual web interface or API | REST API (requires contract) |
| API key required | No | No (but registration recommended) | Yes (enterprise contract) |
| Setup time | 5 minutes | Hours (manual research) | Weeks (contract negotiation) |
| Risk scoring | Pre-calculated composite score | Raw data only | Varies by provider |
| AML/KYC integration | Native MCP protocol | None | API integration required |
| Price | $0.05-$0.08/call | Free (time cost) | $100s-1000s/month |

**Why use Compliance Intelligence MCP:**
- MCP protocol is designed for AI agent integration — call compliance tools with natural language
- Risk scoring is pre-calculated — raw SEC data requires manual risk assessment
- No API key required — works immediately with any MCP-compatible AI agent
- Structured JSON output — directly usable in compliance dashboards and reports
- Complements OFAC sanctions screening — provides SEC enforcement context that OFAC lists don't capture

---

## How it compares to OFAC sanctions screening

**Important distinction:** Compliance Intelligence MCP accesses SEC EDGAR data — it is NOT an OFAC sanctions screening tool. OFAC maintains the Specially Designated Nationals (SDN) list and other sanctions lists that are legally distinct from SEC enforcement actions.

For comprehensive compliance, use both:
1. **OFAC sanctions screening** — Check if a counterparty appears on restricted party lists (SDN, sectoral sanctions, etc.)
2. **SEC EDGAR enforcement data** — Check for regulatory enforcement history, litigation releases, and compliance risk signals

The `screen_entity` tool provides SEC-specific enforcement intelligence that complements OFAC screening but does not replace it. A company may have a clean OFAC record but significant SEC enforcement history — `screen_entity` catches these cases.

---

## Connection examples

### cURL

```bash
curl -X POST "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "screen_entity",
    "params": { "company_name": "Goldman Sachs" }
  }'
```

### Python

```python
import json
import urllib.request

url = "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
payload = json.dumps({
    "tool": "get_company_filings",
    "params": {
        "company_name": "Tesla",
        "form_type": "10-K",
        "max_results": 10
    }
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
response = urllib.request.urlopen(req)
print(json.loads(response.read()))
```

### Node.js

```javascript
const response = await fetch('https://red-cars--compliance-intelligence-mcp.apify.actor/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'get_company_info',
    params: { company_name: 'Microsoft' }
  })
});
const data = await response.json();
console.log(`Company: ${data.result.company_name}`);
console.log(`CIK: ${data.result.cik}`);
console.log(`SIC: ${data.result.sic_description}`);
```

---

## Tips for best results

1. **Use exact company names when possible** — "Goldman Sachs" works better than "Goldman" or "GS"
2. **Verify with CIK when you have it** — If you already know the SEC CIK, pass it directly for faster resolution
3. **Combine tools for due diligence** — Use `screen_entity` first for risk score, then `get_company_filings` for filing history, then `get_company_info` for registration details
4. **Filter by form type for targeted research** — Use `form_type` parameter to get only 10-K annual reports, 8-K current events, or other specific filing types
5. **Date filter for trending** — Use `date_from` and `date_to` to track SEC filings over specific time periods
6. **Cross-reference with OFAC** — Always run OFAC sanctions screening in parallel with `screen_entity` for comprehensive compliance coverage
7. **Review risk signals individually** — The `risk_signals` object breaks down each component of the composite risk score for detailed analysis

---

## Combine with other Apify MCPs

**For comprehensive compliance intelligence workflows:**

- **healthcare-compliance-mcp** — FDA regulatory data (device approvals, adverse events, recalls) for healthcare sector compliance
- **academic-research-mcp** — Find papers, grants, and institutional research for due diligence on academic partnerships
- **patent-search-mcp** — Find patent history for technology due diligence and IP compliance

**Compliance note:** This MCP provides SEC EDGAR regulatory data (enforcement actions, company filings). Comprehensive compliance due diligence requires multiple data sources including OFAC sanctions screening, PEP (Politically Exposed Persons) databases, and sector-specific regulatory bodies. Use this MCP as one input into a broader compliance framework.

---

## SEO Keywords

SEC EDGAR, compliance intelligence, AML, KYC, sanctions screening, OFAC, SEC enforcement actions, company SEC filings, EDGAR search, SEC CIK lookup, risk scoring, regulatory due diligence, AI agent compliance, MCP server, no API key needed, AI agent, Cursor, Claude, Windsurf, financial compliance, securities regulation, anti-money laundering, know your customer, SEC filings API, EDGAR company search, enforcement screening.

---

## License

Apache 2.0