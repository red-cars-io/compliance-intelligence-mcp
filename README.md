# Compliance Intelligence MCP Server

> **[View on Apify](https://apify.com)** | **[Use on Apify Store](https://apify.com)**

AI agents for SEC EDGAR compliance intelligence — enforcement action screening, company filings retrieval, and company registration lookup for AML, KYC, and due diligence workflows. **No API key required.**

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

AI agents can now screen companies for SEC enforcement actions, retrieve 10-K/10-Q/8-K filings, and look up company registration details.

---

## What Compliance Intelligence Can Do

| Data Type | Source | Use Case |
|-----------|--------|----------|
| Enforcement Actions | SEC EDGAR | AML screening, sanctions detection |
| Company Filings | SEC EDGAR | Due diligence, financial analysis |
| Company Registration | SEC EDGAR | KYC verification, entity lookup |

---

## Why Use Compliance Intelligence MCP?

**The problem:** Compliance research — SEC enforcement actions, company filings, sanctions screening — requires searching multiple government databases and synthesizing findings into actionable intelligence. For compliance teams, financial analysts, and AI agents, this data is essential for AML/KYC due diligence, vendor risk assessments, and regulatory monitoring. Manual research takes hours across disconnected SEC EDGAR systems.

**The solution:** AI agents use Compliance Intelligence MCP to get instant, structured compliance intelligence on any company — the SEC EDGAR data layer for compliance workflows.

### Key benefits

- **No API key required** — direct SEC EDGAR access, works immediately
- **AML/KYC screening** — screen companies against SEC enforcement actions
- **Full filings retrieval** — 10-K, 10-Q, 8-K, DEF 14A, 4, S-1 and more
- **Company verification** — CIK lookup, state of incorporation, SIC codes
- **Parallel data fetching** — all SEC EDGAR sources queried simultaneously
- **PPE micro-pricing** — pay per tool call at $0.05-0.08 per call

---

## Features

### SEC EDGAR Enforcement Screening

Screen any company or individual against SEC EDGAR enforcement actions, AAERs (Accounting and Auditing Enforcement Releases), and litigation releases. Returns:
- Risk score (0-100, higher = riskier)
- Risk level (CLEAN / LOW / MEDIUM / HIGH / CRITICAL)
- Sanctions flag for serious violations
- List of enforcement actions with dates, descriptions, and document types

### Full Filings Retrieval

Retrieve any company's SEC filings:
- **10-K**: Annual reports with financial statements
- **10-Q**: Quarterly reports
- **8-K**: Material events (CEO changes, mergers, etc.)
- **DEF 14A**: Proxy statements
- **4**: Insider trading reports
- **S-1**: IPO registrations

Filter by date range and form type. Results include accession numbers, filing dates, and document descriptions.

### Company Registration Lookup

Look up company registration details from SEC EDGAR:
- Company name and CIK
- SIC code and industry description
- State of incorporation
- Fiscal year end
- First filing date

---

## Tools Reference

### `screen_entity`

Screen a company or individual against SEC EDGAR enforcement actions.

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `company_name` | string | Company or individual name to screen |
| `cik` | string | SEC Central Index Key (CIK) — preferred for accuracy |
| `max_results` | integer | Maximum results to return (default: 20) |

**Example:**
```json
{
  "company_name": "Enron Corp",
  "max_results": 10
}
```

**Response:** Risk score, risk level, sanctions flag, list of enforcement actions with accession numbers, dates, and descriptions.

**Price:** $0.08 per call

---

### `get_company_filings`

Get SEC EDGAR filings for a company.

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `company_name` | string | Company name |
| `cik` | string | SEC Central Index Key (CIK) |
| `form_type` | string | Filter by form type (e.g., '10-K', '8-K') |
| `date_from` | string | Start date YYYYMMDD |
| `date_to` | string | End date YYYYMMDD |
| `max_results` | integer | Maximum results (default: 50) |

**Example:**
```json
{
  "cik": "0000032",
  "form_type": "10-K",
  "date_from": "20200101",
  "max_results": 10
}
```

**Response:** List of filings with accession numbers, form types, filing dates, and descriptions.

**Price:** $0.05 per call

---

### `get_company_info`

Get basic company registration information from SEC EDGAR.

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `company_name` | string | Company name |
| `cik` | string | SEC Central Index Key (CIK) — required |

**Example:**
```json
{
  "cik": "0000320193"
}
```

**Response:** Company name, CIK, SIC code, SIC description, state of incorporation, fiscal year end, important dates.

**Price:** $0.05 per call

---

## How It Works

Compliance Intelligence MCP uses three SEC EDGAR data sources:

1. **SEC EFTS Full Text Search** (`efts.sec.gov`) — Searches enforcement actions, AAERs, and litigation releases by keyword
2. **SEC Submissions API** (`data.sec.gov`) — Company filings and registration data via CIK

The server:
1. Receives MCP tool calls via HTTP POST to `/mcp`
2. Routes to appropriate SEC EDGAR API endpoint
3. Fetches and normalizes data from SEC sources
4. Charges PPE (Pay Per Event) via `Actor.charge()`
5. Returns structured JSON responses

---

## Pricing

| Tool | Price |
|------|-------|
| `screen_entity` | $0.08/call |
| `get_company_filings` | $0.05/call |
| `get_company_info` | $0.05/call |

PPE (Pay Per Event) billing via Apify. No subscription required — pay only for what you use.

**Example cost scenarios:**
- Screen one company: $0.08
- Get 10-K and 10-Q for one company: $0.10
- Full KYC lookup: $0.10

---

## Use Cases

### AML/KYC Due Diligence

Compliance teams use Compliance Intelligence MCP to screen potential clients and vendors against SEC enforcement actions before onboarding. The risk score provides instant red flags:

```json
{
  "company_name": "Acme Corp",
  "max_results": 20
}
```

Returns a clean risk score or flags enforcement actions requiring further investigation.

### Vendor Risk Assessment

Before entering vendor relationships, screen vendors for SEC enforcement history:

```json
{
  "company_name": "Vendor Inc",
  "max_results": 10
}
```

### Financial Due Diligence

Investment analysts retrieve 10-K and 10-Q filings to assess company financial health:

```json
{
  "cik": "0000320193",
  "form_type": "10-K",
  "date_from": "20200101"
}
```

### Insider Trading Monitoring

Track insider trading activity via 4 filings:

```json
{
  "cik": "0000320193",
  "form_type": "4",
  "date_from": "20240101",
  "max_results": 50
}
```

---

## How It Compares to Direct SEC API Access

| Aspect | Our MCP | Direct SEC EDGAR API |
|--------|---------|---------------------|
| Price | $0.05-0.08/call | Free (but rate-limited) |
| Setup time | 5 minutes | Minutes to hours |
| API access | MCP (AI-native) | REST (multiple endpoints) |
| Tool coverage | 3 tools (screening, filings, info) | Manual multi-step queries |
| Documentation | Structured, AI-friendly | Dense government docs |
| Rate limiting | Handled by Apify | SEC enforces strict limits |

**Why choose our MCP:**
- MCP protocol is designed for AI agent integration — call compliance tools with natural language
- Composite tools combine multiple SEC EDGAR sources into one call
- Risk scoring already calculated — raw SEC data requires manual assessment
- No SEC API key required — works immediately
- Parallel data fetching across all SEC EDGAR sources

**SEC API alternative:** https://www.sec.gov/developer

---

## Integrations

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://red-cars--compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

### Cursor

Settings → Resources → Add MCP Server → enter the URL above.

### Windsurf

Settings → MCP → Add MCP Server → enter the URL above.

### Other AI Agents

Any AI agent that supports the MCP protocol can connect. Use the URL above.

---

## Technical Details

**Runtime:** Node.js 18+, Apify Standby Mode (HTTP server)

**PPE Billing:** Pay Per Event via `Actor.charge()` — no subscription, pay per tool call

**Data Sources:** SEC EDGAR (efts.sec.gov, data.sec.gov) — no API key required

**Authentication:** None required — SEC EDGAR is publicly accessible

**Rate Limits:** Handled by Apify infrastructure — no direct SEC rate limiting concerns

---

## Alternatives Considered

| Tool | Price | Notes |
|------|-------|-------|
| Direct SEC EDGAR | Free | Rate-limited, complex API, no risk scoring |
| Bloomberg | $25K+/year | Enterprise only, overkill for most use cases |
| LexisNexis | $500+/month | Enterprise only |
| **Compliance Intelligence MCP** | **$0.05-0.08/call** | **No subscription, AI-native, risk scoring included** |

---

## Support

For issues or feature requests, open a GitHub issue at the repo.

---

## Related

- [SEC EDGAR Full Text Search](https://efts.sec.gov)
- [SEC Company Filings API](https://data.sec.gov)
- [SEC Developer Portal](https://www.sec.gov/developer)
- [Apify MCP Servers](https://apify.com/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
