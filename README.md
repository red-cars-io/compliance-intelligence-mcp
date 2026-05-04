# Compliance Intelligence MCP Server

> SEC EDGAR intelligence for AI agents — enforcement actions, company filings, and SEC registration lookup. No API key required.

**[View on Apify](https://apify.com/red.cars/compliance-intelligence-mcp)** | **[MCP Endpoint](https://compliance-intelligence-mcp.apify.actor/mcp)**

---

## Comparison

See how Compliance Intelligence MCP compares to Bloomberg Compliance and LexisNexis.

**[View Comparison →](COMPARISON.md)**

---

## What It Does

Give AI agents direct access to SEC EDGAR — enforcement actions, company filings, and SEC registration data for compliance, due diligence, and regulatory monitoring.

- **Enforcement actions** — search FDA/SEC enforcement actions by company, product type, or classification
- **Company filings** — pull 10-K, 10-Q, 8-K, proxy statements from SEC EDGAR
- **Company info** — SEC registration, CIK, state of incorporation, SIC codes, officers

---

## Quick Start

Add to your MCP client:

```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

---

## Tools

| Tool | Price | Description |
|------|-------|-------------|
| `screen_entity` | $0.08 | SEC EDGAR enforcement actions for company or individual |
| `get_company_filings` | $0.05 | SEC EDGAR filings: 10-K, 10-Q, 8-K, proxy, Form 4 |
| `get_company_info` | $0.05 | SEC EDGAR registration: CIK, SIC, state, officers |

### screen_entity
**When to call:** AI agent doing compliance screening, M&A due diligence, or regulatory risk assessment.
**Example AI prompt:** "Show me any SEC enforcement actions involving Tesla or Elon Musk in the last 5 years."

### get_company_filings
**When to call:** AI agent researching a company's financial disclosures, governance changes, or regulatory filings.
**Example AI prompt:** "Get the last 10 SEC filings for NVIDIA, including 10-K annual reports and 8-K material events."

### get_company_info
**When to call:** AI agent looking up a company's SEC registration details — CIK, industry classification, state of incorporation.
**Example AI prompt:** "What's Apple's SEC registration — CIK, state of incorporation, and SIC description?"

---

## Data Sources

| Source | What's Available |
|--------|-----------------|
| SEC EDGAR | Enforcement actions, company filings, registration info |
| FDA openFDA | Drug and device enforcement actions |

---

## Pricing

| Tool | Per Call |
|------|----------|
| `screen_entity` | $0.08 |
| `get_company_filings` | $0.05 |
| `get_company_info` | $0.05 |

No subscription. Pay per use via Apify PPE. No API keys required.

---

## Example Calls

### Screen for enforcement actions

```
screen_entity(company_name="Pfizer", max_results=10)
```

Returns:
```json
{
  "company_name": "Pfizer",
  "total_actions": 3,
  "actions": [
    {
      "company_name": "Pfizer Inc.",
      "filed_date": "2023-06-15",
      "document_type": "AAER",
      "summary": "Accounting violations related to off-label promotion"
    }
  ],
  "risk_score": 45,
  "risk_level": "MEDIUM",
  "sources": ["SEC EDGAR"]
}
```

### Get company filings

```
get_company_filings(cik="0000078518", form_type="10-K", max_results=5)
```

Returns:
```json
{
  "cik": "0000078518",
  "company_name": "PFIZER INC.",
  "total_filings": 5,
  "filings": [
    {
      "form_type": "10-K",
      "filed_date": "2024-02-15",
      "description": "Annual report"
    }
  ]
}
```

---

## Connect to AI Agents

### Claude Desktop / Cursor / Windsurf
```json
{
  "mcpServers": {
    "compliance-intelligence-mcp": {
      "url": "https://compliance-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

---

## SEO Keywords

SEC EDGAR API, SEC enforcement actions, company filings API, AI agent compliance, EDGAR company search, SEC registration lookup, CIK lookup, corporate compliance automation, M&A due diligence, regulatory monitoring, AI agent SEC research, [Comparison: vs Bloomberg, LexisNexis](COMPARISON.md)
