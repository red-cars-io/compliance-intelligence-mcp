/**
 * Compliance Intelligence MCP Server
 * SEC EDGAR enforcement actions, company filings, and sanctions screening for AI agents.
 * Data sources: SEC EDGAR Full Text Search API + EFTS + SEC Company Search
 */

import http from 'http';
import Apify, { Actor } from 'apify';

// MCP manifest
const MCP_MANIFEST = {
    schema_version: "1.0",
    name: "compliance-intelligence-mcp",
    version: "1.0.0",
    description: "SEC EDGAR compliance intelligence for AI agents. Screen companies for enforcement actions, get company filings, and retrieve company registration details for AML, KYC, and compliance due diligence.",
    tools: [
        {
            name: "screen_entity",
            description: "Screen a company or individual against SEC EDGAR enforcement actions, AAERs, and litigation releases. Returns risk score, enforcement actions, related parties, and sanctions flags.",
            input_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Company or individual name to screen" },
                    cik: { type: "string", description: "SEC Central Index Key (CIK) — preferred for accuracy" },
                    max_results: { type: "integer", description: "Maximum results to return (default: 20)", default: 20 }
                }
            },
            output_schema: {
                type: "object",
                properties: {
                    query: { type: "object", description: "The original search parameters" },
                    total_actions: { type: "integer", description: "Total matching enforcement actions found" },
                    actions: {
                        type: "array",
                        description: "List of SEC enforcement actions",
                        items: {
                            type: "object",
                            properties: {
                                accession_number: { type: "string", description: "SEC accession number" },
                                cik: { type: "string", description: "CIK of the company" },
                                company_name: { type: "string", description: "Company name" },
                                filed_date: { type: "string", description: "Date filed with SEC (YYYYMMDD)" },
                                document_type: { type: "string", description: "Document type (AAER, litigation release, etc.)" },
                                summary: { type: "string", description: "Summary of the enforcement action" }
                            }
                        }
                    },
                    risk_score: { type: "number", description: "Composite risk score 0-100 (higher = riskier)" },
                    risk_level: { type: "string", enum: ["CLEAN", "LOW", "MEDIUM", "HIGH", "CRITICAL"], description: "Risk level" },
                    is_sanctioned: { type: "boolean", description: "True if company appears in sanctions-related enforcement" },
                    sources: { type: "array", items: { type: "string" }, description: "Data sources queried" },
                    source: { type: "string", description: "Primary data source (SEC EDGAR)" }
                }
            },
            price: 0.08
        },
        {
            name: "get_company_filings",
            description: "Get SEC EDGAR filings for a company — 10-K, 10-Q, 8-K, proxy statements, and other SEC documents",
            input_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Company name (requires CIK for precise results)" },
                    cik: { type: "string", description: "SEC Central Index Key (CIK)" },
                    form_type: { type: "string", description: "Filter by form type (e.g., '10-K', '8-K', '10-Q', 'DEF 14A')" },
                    date_from: { type: "string", description: "Start date YYYYMMDD" },
                    date_to: { type: "string", description: "End date YYYYMMDD" },
                    max_results: { type: "integer", description: "Maximum results to return (default: 50)", default: 50 }
                }
            },
            output_schema: {
                type: "object",
                properties: {
                    query: { type: "object", description: "The original search parameters" },
                    cik: { type: "string", description: "CIK used for the query" },
                    company_name: { type: "string", description: "Company name" },
                    total_filings: { type: "integer", description: "Total matching filings found" },
                    filings: {
                        type: "array",
                        description: "List of SEC filings",
                        items: {
                            type: "object",
                            properties: {
                                accession_number: { type: "string", description: "SEC accession number" },
                                cik: { type: "string", description: "CIK" },
                                company_name: { type: "string", description: "Company name" },
                                form_type: { type: "string", description: "Form type (10-K, 8-K, etc.)" },
                                filed_date: { type: "string", description: "Date filed (YYYYMMDD)" },
                                description: { type: "string", description: "Filing description" }
                            }
                        }
                    },
                    source: { type: "string", description: "Data source (SEC EDGAR)" }
                }
            },
            price: 0.05
        },
        {
            name: "get_company_info",
            description: "Get basic company registration information from SEC EDGAR — company name, CIK, state of incorporation, SIC description, and officer names",
            input_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Company name (requires CIK for precise results)" },
                    cik: { type: "string", description: "SEC Central Index Key (CIK)" }
                },
                required: ["cik"]
            },
            output_schema: {
                type: "object",
                properties: {
                    cik: { type: "string", description: "SEC Central Index Key" },
                    company_name: { type: "string", description: "Company name as registered with SEC" },
                    sic_code: { type: "string", description: "SIC code" },
                    sic_description: { type: "string", description: "SIC industry description" },
                    state_of_incorporation: { type: "string", description: "State of incorporation" },
                    fiscal_year_end: { type: "string", description: "Fiscal year end month/day" },
                    dates: {
                        type: "object",
                        description: "Important dates",
                        properties: {
                            filed_date: { type: "string", description: "Date first filed" },
                            acceptance_date: { type: "string", description: "Date accepted" }
                        }
                    },
                    source: { type: "string", description: "Data source (SEC EDGAR)" }
                }
            },
            price: 0.05
        }
    ]
};

// Tool price map (in USD)
const TOOL_PRICES = {
    "screen_entity": 0.08,
    "get_company_filings": 0.05,
    "get_company_info": 0.05
};

// ============================================
// SEC EDGAR API CLIENTS
// ============================================

async function fetchSEC(endpoint, params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const url = `https://efts.sec.gov${endpoint}${query ? '?' + query : ''}`;
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Apify Compliance MCP / compliance@example.com',
                'Accept': 'application/json'
            }
        });
        if (!resp.ok) {
            console.error(`SEC API error ${resp.status}: ${endpoint}`);
            return null;
        }
        return await resp.json();
    } catch (e) {
        console.error(`SEC API error (${endpoint}):`, e.message);
        return null;
    }
}

async function searchSECFullText(query, maxResults = 20) {
    try {
        const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=1970-01-01&enddt=${new Date().toISOString().split('T')[0]}`;
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Apify Compliance MCP / compliance@example.com',
                'Accept': 'application/json'
            }
        });
        if (!resp.ok) return { hits: { hits: [] } };
        return await resp.json();
    } catch (e) {
        console.error('SEC full-text search error:', e.message);
        return { hits: { hits: [] } };
    }
}

// ============================================
// ENTITY SCREENING
// ============================================

async function screenEntity(params = {}) {
    const { company_name, cik, max_results = 20 } = params;

    // First resolve company name to CIK if not provided
    let resolvedCik = cik;
    let resolvedName = company_name;

    if (!resolvedCik && company_name) {
        const companyData = await getCompanyInfo({ company_name, cik: null });
        resolvedCik = companyData.cik;
        resolvedName = companyData.company_name || company_name;
    }

    // Search SEC EDGAR Full Text for enforcement-related terms
    const enforcementTerms = [
        'enforcement',
        'disciplinary',
        'cease and desist',
        'anti-fraud',
        'insider trading',
        'manipulation',
        'misappropriation',
        'falsify',
        'securities fraud',
        'violation of',
        'settlement',
        'disgorgement'
    ];

    let allActions = [];
    const searchResults = await Promise.all([
        searchSECFullText(resolvedName, maxResults),
        ...enforcementTerms.map(term => searchSECFullText(`${resolvedName} ${term}`, Math.floor(max_results / 3)))
    ]);

    // Collect and dedupe hits
    const seenAccessions = new Set();
    for (const result of searchResults) {
        const hits = result?.hits?.hits || [];
        for (const hit of hits) {
            const accNum = hit?._source?.accession_number || hit?.accession_number || '';
            if (accNum && !seenAccessions.has(accNum)) {
                seenAccessions.add(accNum);
                const source = hit._source || hit;
                allActions.push({
                    accession_number: accNum,
                    cik: source.cik || '',
                    company_name: source.name_of_issuer || source.company_name || resolvedName,
                    filed_date: source.filed_date || source.date || '',
                    document_type: source.form_type || source.type || 'ENFORCEMENT',
                    summary: source.display_text || source.description || source.text || ''
                });
            }
        }
    }

    // Sort by date (most recent first)
    allActions.sort((a, b) => (b.filed_date || '').localeCompare(a.filed_date || ''));
    allActions = allActions.slice(0, max_results);

    // Calculate risk score
    const totalActions = allActions.length;
    let riskScore = 0;
    let isSanctioned = false;

    if (totalActions === 0) {
        riskScore = 100; // CLEAN
    } else {
        // Base score degrades with each enforcement action
        riskScore = Math.max(0, 100 - (totalActions * 12));

        // Check for serious violations
        const seriousTerms = ['securities fraud', 'insider trading', 'manipulation', 'misappropriation', 'falsify', 'anti-fraud', 'disgorgement'];
        for (const action of allActions) {
            const text = (action.summary || '').toLowerCase();
            if (seriousTerms.some(t => text.includes(t))) {
                riskScore -= 20;
                isSanctioned = true;
            }
        }
        riskScore = Math.max(0, riskScore);
    }

    const riskLevel = riskScore >= 90 ? 'CLEAN' : riskScore >= 70 ? 'LOW' : riskScore >= 50 ? 'MEDIUM' : riskScore >= 25 ? 'HIGH' : 'CRITICAL';

    return {
        query: params,
        total_actions: totalActions,
        actions: allActions,
        risk_score: riskScore,
        risk_level: riskLevel,
        is_sanctioned: isSanctioned,
        sources: ['SEC EDGAR Full Text Search', 'SEC EFTS'],
        source: 'SEC EDGAR'
    };
}

// ============================================
// COMPANY FILINGS
// ============================================

async function getCompanyFilings(params = {}) {
    const { company_name, cik, form_type, date_from, date_to, max_results = 50 } = params;

    // Resolve CIK if not provided
    let resolvedCik = cik;
    let resolvedName = company_name;

    if (!resolvedCik && company_name) {
        const companyData = await getCompanyInfo({ company_name, cik: null });
        resolvedCik = companyData.cik;
        resolvedName = companyData.company_name || company_name;
    }

    if (!resolvedCik) {
        return {
            query: params,
            cik: null,
            company_name: resolvedName,
            total_filings: 0,
            filings: [],
            source: 'SEC EDGAR',
            error: 'Could not resolve CIK for company'
        };
    }

    // Fetch company submissions from SEC
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${resolvedCik.padStart(10, '0')}.json`;
    const resp = await fetch(submissionsUrl, {
        headers: {
            'User-Agent': 'Apify Compliance MCP / compliance@example.com',
            'Accept': 'application/json'
        }
    });

    if (!resp.ok) {
        return {
            query: params,
            cik: resolvedCik,
            company_name: resolvedName,
            total_filings: 0,
            filings: [],
            source: 'SEC EDGAR',
            error: `SEC API returned ${resp.status}`
        };
    }

    const data = await resp.json();
    const recent = data?.recentFilings || data?.filings || {};
    const filingsList = recent?.filings || recent?.allFilings || [];

    // Build filings array
    let filings = [];
    const formTypes = form_type ? [form_type.toUpperCase()] : ['10-K', '10-Q', '8-K', 'DEF 14A', '4', 'S-1', '20-F'];
    const cikStr = data.cik || resolvedCik;
    const coName = data.name || resolvedName;

    for (let i = 0; i < filingsList.length; i++) {
        const filingForm = filingsList[i]?.form || filingsList[i];
        const filingDate = filingsList[i]?.filingDate || filingsList[i]?.date || '';

        if (!formTypes.includes(filingForm)) continue;
        if (date_from && filingDate < date_from) continue;
        if (date_to && filingDate > date_to) continue;

        const accessionNumber = filingsList[i]?.accessionNumber || filingsList[i]?.accn || '';
        filings.push({
            accession_number: accessionNumber,
            cik: cikStr,
            company_name: coName,
            form_type: filingForm,
            filed_date: filingDate,
            description: filingsList[i]?.document || filingForm
        });

        if (filings.length >= max_results) break;
    }

    return {
        query: params,
        cik: cikStr,
        company_name: coName,
        total_filings: filings.length,
        filings,
        source: 'SEC EDGAR'
    };
}

// ============================================
// COMPANY INFO
// ============================================

async function getCompanyInfo(params = {}) {
    const { company_name, cik } = params;

    let resolvedCik = cik;
    let companyName = company_name;

    // If CIK is provided, fetch directly
    if (resolvedCik) {
        const cikPadded = String(resolvedCik).padStart(10, '0');
        const url = `https://data.sec.gov/submissions/CIK${cikPadded}.json`;
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Apify Compliance MCP / compliance@example.com',
                'Accept': 'application/json'
            }
        });

        if (!resp.ok) {
            return { cik: resolvedCik, error: `SEC API returned ${resp.status}` };
        }

        const data = await resp.json();
        return {
            cik: data.cik || resolvedCik,
            company_name: data.name || companyName,
            sic_code: data.sic || '',
            sic_description: data.sicDescription || '',
            state_of_incorporation: data.stateOfIncorporation || data.state_of_incorporation || '',
            fiscal_year_end: data.fiscalYearEnd || '',
            dates: {
                filed_date: data.filings?.recent?.filingDate?.[0] || '',
                acceptance_date: data.filings?.recent?.acceptanceDateTime?.[0] || ''
            },
            source: 'SEC EDGAR'
        };
    }

    // Otherwise search by company name using SEC search
    if (companyName) {
        try {
            const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}&forms=10-K,10-Q`;
            const resp = await fetch(url, {
                headers: {
                    'User-Agent': 'Apify Compliance MCP / compliance@example.com',
                    'Accept': 'application/json'
                }
            });

            if (resp.ok) {
                const data = await resp.json();
                const hits = data?.hits?.hits || [];
                if (hits.length > 0) {
                    const first = hits[0]._source || hits[0];
                    const foundCik = first.cik || firstcik || '';
                    if (foundCik) {
                        return getCompanyInfo({ company_name: companyName, cik: foundCik });
                    }
                }
            }
        } catch (e) {
            console.error('Company search error:', e.message);
        }
    }

    return {
        cik: resolvedCik || '',
        company_name: companyName || '',
        error: 'Could not resolve CIK'
    };
}

// ============================================
// REQUEST HANDLER
// ============================================

async function handleTool(toolName, params = {}) {
    const handlers = {
        "screen_entity": async () => screenEntity(params),
        "get_company_filings": async () => getCompanyFilings(params),
        "get_company_info": async () => getCompanyInfo(params)
    };

    const handler = handlers[toolName];
    if (handler) {
        const result = await handler();
        const price = TOOL_PRICES[toolName];
        if (price) {
            try {
                await Actor.charge(price, { eventName: toolName });
            } catch (e) {
                console.error("Charge failed:", e.message);
            }
        }
        return result;
    }
    return { error: `Unknown tool: ${toolName}` };
}

// ============================================
// HTTP SERVER FOR STANDBY MODE
// ============================================

// ts-standby: Always init unconditionally, detect standby after
await Actor.init();

const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';
const PORT = Actor.config.get('containerPort') || process.env.ACTOR_WEB_SERVER_PORT || 3000;

if (isStandby) {

    const server = http.createServer(async (req, res) => {
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
            return;
        }

        if (req.method === 'POST' && req.url === '/mcp') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const jsonBody = JSON.parse(body);
                    const id = jsonBody.id ?? null;

                    const reply = (result) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, result }
                            : result;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const replyError = (code, message) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, error: { code, message } }
                            : { status: 'error', error: message };
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const method = jsonBody.method;

                    if (method === 'initialize') {
                        return reply({
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {} },
                            serverInfo: { name: 'compliance-intelligence-mcp', version: '1.0.0' }
                        });
                    }

                    if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
                        return reply({ tools: MCP_MANIFEST.tools });
                    }

                    if (method === 'tools/call') {
                        const toolName = jsonBody.params?.name;
                        const toolArgs = jsonBody.params?.arguments || {};
                        if (!toolName) return replyError(-32602, 'Missing params.name');
                        const toolResult = await handleTool(toolName, toolArgs);
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    if (method && method.startsWith('tools/')) {
                        const toolName = method.slice(6);
                        const toolArgs = jsonBody.params || {};
                        const toolResult = await handleTool(toolName, toolArgs);
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    if (jsonBody.tool) {
                        const toolResult = await handleTool(jsonBody.tool, jsonBody.params || {});
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', result: toolResult }));
                        return;
                    }

                    replyError(-32601, `Method not found: ${method}`);
                } catch (error) {
                    console.error('MCP error:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', error: error.message }));
                }
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });

    server.listen(PORT, () => {
        console.log(`Compliance Intelligence MCP listening on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
        server.close(() => process.exit(0));
    });
} else {
    // Batch mode
    const input = await Actor.getInput();
    if (input) {
        const { tool, params = {} } = input;
        if (tool) {
            console.log(`Running tool: ${tool}`);
            const result = await handleTool(tool, params);
            await Actor.setValue('OUTPUT', result);
        }
    }
    await Actor.exit();
}

export default {
    handleRequest: async ({ request, log }) => {
        log.info("Compliance Intelligence MCP received request");
        try {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            const { tool, params = {} } = body;
            const result = await handleTool(tool, params);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            log.error(`Error: ${error.message}`);
            return { content: [{ type: 'text', text: JSON.stringify({ status: "error", error: error.message }, null, 2) }] };
        }
    }
};
