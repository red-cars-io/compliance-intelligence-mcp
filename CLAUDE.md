# Compliance Intelligence

**Type**: Apify MCP Actor (TypeScript)
**Purpose**: SEC EDGAR compliance intelligence for AI agents — enforcement actions, company filings, and sanctions screening for AML and KYC workflows
**Stack**: Apify SDK, CheerioCrawler (HTTP API), MCP protocol, standby mode

## Quick Start

```bash
cd ~/Projects/apify-actors/compliance-intelligence-mcp
apify run          # Local development
apify push          # Deploy to Apify
```

## Key Files

- `src/main.ts` — MCP handler entry point with `handleRequest` export
- `.actor/actor.json` — Standby mode enabled (`usesStandbyMode: true`)
- `.actor/input_schema.json` — Tool definitions
- `README.md` — Auto-generated on build

## Architecture

- Standby MCP via `handleRequest` export
- Readiness probe at GET / (checks `x-apify-container-server-readiness-probe` header)
- Uses Apify SDK log package (`apify/log`)
- PPE configured — $0.03–0.15/tool
- Designed for AML/KYC compliance workflows

## Tools

| Tool | Description | PPE |
|------|-------------|-----|
| `search_edgar` | SEC EDGAR company filings search | $0.03 |
| `enforcement_actions` | SEC enforcement action lookup | $0.05 |
| `sanctions_screen` | Screen company/entity against sanctions lists | $0.10 |
| `kyc_report` | Combined compliance report for entity | $0.15 |

## Notes

- Health check cron: `~/bin/fleet-health.sh`
- Deployed at: `red-cars--compliance-intelligence-mcp.apify.actor`
- SEC EDGAR API is public; no auth needed
- OpenSanctions for sanctions screening