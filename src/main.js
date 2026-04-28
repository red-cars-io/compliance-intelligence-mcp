/**
 * Compliance Intelligence MCP Server
 * SEC EDGAR enforcement intelligence for AI agents.
 * Data sources: SEC EDGAR full-text search + company filings API
 */

import http from 'http';
import Apify, { Actor } from 'apify';

// MCP manifest
const MCP_MANIFEST = {
    schema_version: "1.0",
    name: "compliance-intelligence-mcp",
    version: "1.0.0",
    description: "SEC EDGAR compliance intelligence for AI agents. Screen entities for enforcement actions, access company filings, and retrieve regulatory data for AML, KYC, and sanctions screening.",
    tools: [
        {
            name: "screen_entity",
            description: "Screen a company or person against SEC EDGAR for enforcement actions, litigation releases, and risk indicators. Returns a composite risk score, enforcement action count, and related party information.",
            input_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Company name to screen (e.g., 'Apple Inc' or 'Goldman Sachs')" },
                    cik: { type: "string", description: "SEC Central Index Key (CIK) number — alternative to company_name" }
                }
            },
            output_schema: {
                type: "object",
                properties: {
                    entity: { type: "string", description: "Screened entity name or CIK" },
                    cik: { type: "string", description: "SEC CIK if resolved" },
                    risk_score: { type: "number", description: "Composite risk score 0-100 (higher = cleaner)" },
                    risk_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], description: "Risk classification" },
                    enforcement_actions_count: { type: "integer", description: "Number of SEC enforcement actions found" },
                    litigation_releases_count: { type: "integer", description: "Number of litigation releases found" },
                    risk_signals: {
                        type: "object",
                        description: "Individual risk signal breakdown",
                        properties: {
                            enforcement_trail: { type: "object", description: "Enforcement history signal" },
                            litigation_references: { type: "object", description: "Litigation reference signal" },
                            regulatory_flags: { type: "object", description: "Regulatory flag signal" }
                        }
                    },
                    related_parties: {
                        type: "array",
                        items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } } },
                        description: "Key principals and related parties"
                    },
                    verdict: { type: "string", description: "Human-readable compliance assessment" },
                    sources: { type: "array", items: { type: "string" }, description: "Data sources queried" }
                }
            },
            price: 0.08
        },
        {
            name: "get_company_filings",
            description: "Retrieve SEC EDGAR filings for a company including 10-K annual reports, 8-K current reports, proxy statements, and other regulatory filings. Returns a list of filings with form type, filing date, and description.",
            input_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Company name to search for" },
                    cik: { type: "string", description: "SEC CIK number — alternative to company_name" },
                    form_type: { type: "string", description: "Filter by form type (e.g., '10-K', '8-K', '10-Q', 'DEF 14A')" },
                    date_from: { type: "string", description: "Start date YYYY-MM-DD" },
                    date_to: { type: "string", description: "End date YYYY-MM-DD" },
                    max_results: { type: "integer", description: "Maximum results to return (default: 20)", default: 20 }
                }
            },
            output_schema: {
                type: "object",
                properties: {
                    entity: { type: "string", description: "Company name or CIK" },
                    cik: { type: "string", description: "SEC CIK" },
                    company_name: { type: "string", description: "Resolved company name" },
                    total_filings: { type: "integer", description: "Total filings matching query" },
                    filings: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                accession_number: { type: "string", description: "SEC accession number" },
                                form_type: { type: "string", description: "Form type (10-K, 8-K, etc.)" },
                                filing_date: { type: "string", description: "Filing date YYYY-MM-DD" },
                                description: { type: "string", description: "Filing description" },
                                document_url: { type: "string", description: "URL to filing document" }
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
            description: "Get basic company information from SEC EDGAR including company name, CIK, state of incorporation, SIC code description, and filing history summary.",
            input_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Company name to look up" },
                    cik: { type: "string", description: "SEC CIK number — alternative to company_name" }
                }
            },
            output_schema: {
                type: "object",
                properties: {
                    company_name: { type: "string", description: "Registered company name" },
                    cik: { type: "string", description: "SEC Central Index Key" },
                    sic_code: { type: "string", description: "Standard Industrial Classification code" },
                    sic_description: { type: "string", description: "SIC code description" },
                    state_of_incorporation: { type: "string", description: "State of incorporation" },
                    fiscal_year_end: { type: "string", description: "Fiscal year end month/day" },
                    mailing_address: { type: "object", description: "Mailing address", properties: { street1: { type: "string" }, city: { type: "string" }, state: { type: "string" }, zip: { type: "string" } } },
                    business_address: { type: "object", description: "Business address", properties: { street1: { type: "string" }, city: { type: "string" }, state: { type: "string" }, zip: { type: "string" } } },
                    filings_count: { type: "integer", description: "Total number of SEC filings" },
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

const EDGAR_BASE = "https://www.sec.gov";
const EDGAR_ARCHIVE = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_HOST = "efts.sec.gov";
const USER_AGENT = "Apify AI Agent (compliance-intelligence-mcp@1.0.0; ai-agent@apify.com)";

/**
 * Make an SEC EDGAR API request with proper headers.
 * SEC requires a valid User-Agent header identifying the requestor.
 */
async function fetchEdgar(path, params = {}) {
    try {
        const url = new URL(path, EDGAR_BASE);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        const resp = await fetch(url.toString(), {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept-Encoding": "gzip, deflate"
            }
        });

        if (!resp.ok) {
            console.error(`EDGAR API error ${resp.status} for ${path}: ${resp.statusText}`);
            return null;
        }

        return await resp.json();
    } catch (e) {
        console.error(`EDGAR fetch error (${path}):`, e.message);
        return null;
    }
}

/**
 * Search EDGAR full-text search for enforcement-related filings.
 * @param {string} companyName - Company name to search
 * @param {number} maxResults - Maximum results
 */
async function searchEdgarEnforcement(companyName, maxResults = 20) {
    try {
        // Use EDGAR full-text search for company-related enforcement filings
        // Search for AAER (AIE Annual Report), ENF (Enforcement), NOBO (Non-issuer)
        const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}&dateRange=custom&category=form-type&startdt=2010-01-01&enddt=${new Date().toISOString().split('T')[0]}&forms=AAER,ENF,NOBO`;

        const resp = await fetch(searchUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept-Encoding": "gzip, deflate"
            }
        });

        if (!resp.ok) {
            // Fallback to company search
            return await searchEdgarCompany(companyName, maxResults, true);
        }

        const data = await resp.json();

        // Parse hits from the EDGAR full-text search response
        const hits = data.hits?.hits?.hit || [];
        return hits.slice(0, maxResults).map(h => ({
            accession_number: h.accessionNumber || '',
            form_type: h.formType || '',
            filing_date: h.date || '',
            description: h.description || `${h.formType} - ${companyName}`,
            entity_name: h.entityName || companyName
        }));
    } catch (e) {
        console.error("Enforcement search error:", e.message);
        return [];
    }
}

/**
 * Search EDGAR for company filings using the EFTS search index.
 * @param {string} companyName - Company name
 * @param {number} maxResults - Maximum results
 * @param {boolean} enforcementOnly - Only enforcement-related forms
 */
async function searchEdgarCompany(companyName, maxResults = 20, enforcementOnly = false) {
    try {
        // Use the SEC EDGAR full-text search API
        const forms = enforcementOnly ? 'AAER,ENF' : '';
        const params = new URLSearchParams({
            q: companyName,
            dateRange: 'custom',
            startdt: '1995-01-01',
            enddt: new Date().toISOString().split('T')[0],
            forms: forms
        });

        const resp = await fetch(`https://efts.sec.gov/LATEST/search-index?${params}`, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept-Encoding": "gzip, deflate"
            }
        });

        if (!resp.ok) {
            console.error(`EDGAR search error: ${resp.status}`);
            return [];
        }

        const data = await resp.json();
        const hits = data.hits?.hits?.hit || [];

        return hits.slice(0, maxResults).map(h => ({
            accession_number: h.accessionNumber || '',
            form_type: h.formType || '',
            filing_date: h.date || '',
            description: h.description || `${h.formType || 'Filing'} - ${h.entityName || companyName}`,
            entity_name: h.entityName || companyName
        }));
    } catch (e) {
        console.error("EDGAR company search error:", e.message);
        return [];
    }
}

/**
 * Search for SEC enforcement/complaint filings using the SEC EDGAR search.
 */
async function searchEnforcementFilings(entityName, maxResults = 10) {
    try {
        const params = new URLSearchParams({
            q: entityName,
            forms: 'AAER,ENF',
            dateRange: 'custom',
            startdt: '2000-01-01',
            enddt: new Date().toISOString().split('T')[0]
        });

        const resp = await fetch(`https://efts.sec.gov/LATEST/search-index?${params}`, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept-Encoding": "gzip, deflate"
            }
        });

        if (!resp.ok) return [];

        const data = await resp.json();
        const hits = data.hits?.hits?.hit || [];
        return hits.slice(0, maxResults).map(h => ({
            accession_number: h.accessionNumber || '',
            form_type: h.formType || 'ENF',
            filing_date: h.date || '',
            description: h.description || '',
            entity_name: h.entityName || entityName
        }));
    } catch (e) {
        console.error("Enforcement filings search error:", e.message);
        return [];
    }
}

/**
 * Resolve company name to CIK using SEC's company search.
 */
async function resolveNameToCIK(companyName) {
    try {
        const resp = await fetch(
            `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(companyName)}&output=atom`,
            { headers: { "User-Agent": USER_AGENT } }
        );

        if (!resp.ok) return null;

        const text = await resp.text();

        // Parse CIK from atom feed
        const cikMatch = text.match(/CIK=(\d+)/);
        if (cikMatch) {
            return cikMatch[1].padStart(10, '0');
        }

        // Also try the EFTS search API
        const searchResp = await fetch(
            `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}&dateRange=custom&startdt=2020-01-01&enddt=${new Date().toISOString().split('T')[0]}`,
            { headers: { "User-Agent": USER_AGENT } }
        );

        if (searchResp.ok) {
            const searchData = await searchResp.json();
            const hits = searchData.hits?.hits?.hit || [];
            if (hits.length > 0) {
                const firstHit = hits[0];
                return firstHit.cik || null;
            }
        }

        return null;
    } catch (e) {
        console.error("CIK resolution error:", e.message);
        return null;
    }
}

/**
 * Get company submissions JSON from SEC EDGAR.
 * This is the canonical source for company info and filing history.
 */
async function getCompanySubmissions(cik) {
    try {
        const paddedCik = cik.toString().padStart(10, '0');
        const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

        const resp = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept-Encoding": "gzip, deflate"
            }
        });

        if (!resp.ok) {
            console.error(`Submissions API error: ${resp.status}`);
            return null;
        }

        return await resp.json();
    } catch (e) {
        console.error("Submissions fetch error:", e.message);
        return null;
    }
}

/**
 * Get recent filings list for a company.
 */
async function getRecentFilings(cik, formType = null, dateFrom = null, dateTo = null, maxResults = 20) {
    try {
        const submissions = await getCompanySubmissions(cik);
        if (!submissions) return { filings: [], total: 0 };

        const recentReports = submissions?.recent || {};

        const accessions = recentReports.accessionNumber || [];
        const formTypes = recentReports.form || [];
        const filingDates = recentReports.filingDate || [];

        let filings = accessions.map((acc, i) => ({
            accession_number: acc.replace(/--/g, ''),
            form_type: formTypes[i] || '',
            filing_date: filingDates[i] || '',
            description: formTypes[i] || 'SEC Filing',
            entity_name: submissions?.name || 'Unknown'
        })).filter(f => f.accession_number);

        // Filter by form type
        if (formType) {
            filings = filings.filter(f => f.form_type.toUpperCase().includes(formType.toUpperCase()));
        }

        // Filter by date
        if (dateFrom) {
            filings = filings.filter(f => f.filing_date >= dateFrom);
        }
        if (dateTo) {
            filings = filings.filter(f => f.filing_date <= dateTo);
        }

        return {
            filings: filings.slice(0, maxResults),
            total: filings.length
        };
    } catch (e) {
        console.error("Recent filings error:", e.message);
        return { filings: [], total: 0 };
    }
}

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

/**
 * Tool: screen_entity
 * Screen a company/person for SEC enforcement actions and compliance risk.
 */
async function screenEntity(params = {}) {
    const { company_name, cik } = params;

    if (!company_name && !cik) {
        return { error: "Either company_name or cik is required" };
    }

    let resolvedCik = cik;
    let resolvedName = company_name;

    // Resolve CIK if only name is provided
    if (company_name && !cik) {
        resolvedCik = await resolveNameToCIK(company_name);
        resolvedName = company_name;
    }

    // Search for enforcement-related filings
    const enforcementFilings = await searchEnforcementFilings(resolvedName || company_name, 30);
    const enforcementCount = enforcementFilings.filter(f =>
        ['AAER', 'ENF', 'NOBO'].includes(f.form_type)
    ).length;

    // Get additional company data if we have a CIK
    let companyData = null;
    if (resolvedCik) {
        companyData = await getCompanySubmissions(resolvedCik);
    } else {
        // Try to find CIK from enforcement results
        const firstHit = enforcementFilings[0];
        if (firstHit?.entity_name) {
            const foundCik = await resolveNameToCIK(firstHit.entity_name);
            if (foundCik) {
                resolvedCik = foundCik;
                companyData = await getCompanySubmissions(foundCik);
            }
        }
    }

    // Calculate risk score
    const riskScore = calculateEntityRiskScore({
        enforcementCount,
        litigationReleases: enforcementCount,
        totalFilings: companyData?.filingsCount || 0
    });

    // Get related parties (directors/officers) if available
    const relatedParties = [];
    if (companyData) {
        const names = companyData?.name || '';
        relatedParties.push({ name: names, role: 'Reporting Company' });

        // Add filers if present
        const filers = companyData?.filers || [];
        filers.forEach(f => {
            if (f.cik && f.cik !== resolvedCik) {
                relatedParties.push({ name: f.name || f.cik, role: 'Related Filer' });
            }
        });
    }

    // Determine risk level
    const riskLevel = getRiskLevel(riskScore);

    // Build risk signals
    const riskSignals = {
        enforcement_trail: enforcementCount === 0
            ? { level: "CLEAN", label: "No SEC enforcement actions found" }
            : { level: enforcementCount > 5 ? "HIGH" : "MEDIUM", label: `${enforcementCount} enforcement-related filings found` },
        litigation_references: { level: "INFO", label: `${enforcementFilings.length} total SEC filings found` },
        regulatory_flags: { level: "NONE", label: "No regulatory flags detected" }
    };

    return {
        entity: resolvedName || resolvedCik,
        cik: resolvedCik || null,
        risk_score: riskScore,
        risk_level: riskLevel,
        enforcement_actions_count: enforcementCount,
        litigation_releases_count: enforcementFilings.length,
        risk_signals: riskSignals,
        related_parties: relatedParties.slice(0, 10),
        verdict: buildEntityVerdict(riskLevel, enforcementCount, relatedParties.length),
        sources: ["SEC EDGAR Full-Text Search", "SEC Company Filings Database"]
    };
}

/**
 * Tool: get_company_filings
 * Get SEC EDGAR filings for a company.
 */
async function getCompanyFilings(params = {}) {
    const { company_name, cik, form_type, date_from, date_to, max_results = 20 } = params;

    if (!company_name && !cik) {
        return { error: "Either company_name or cik is required" };
    }

    let resolvedCik = cik;

    // Resolve CIK if only name is provided
    if (company_name && !cik) {
        const foundCik = await resolveNameToCIK(company_name);
        if (!foundCik) {
            return { error: `Could not resolve CIK for company: ${company_name}` };
        }
        resolvedCik = foundCik;
    }

    // Get company name if we only have CIK
    let resolvedName = company_name;
    if (!resolvedName && resolvedCik) {
        const submissions = await getCompanySubmissions(resolvedCik);
        resolvedName = submissions?.name || resolvedCik;
    }

    // Fetch filings
    const result = await getRecentFilings(resolvedCik, form_type, date_from, date_to, max_results);

    return {
        entity: company_name || resolvedCik,
        cik: resolvedCik,
        company_name: resolvedName,
        total_filings: result.total,
        filings: result.filings.map(f => ({
            accession_number: f.accession_number,
            form_type: f.form_type,
            filing_date: f.filing_date,
            description: f.description,
            document_url: `https://www.sec.gov/Archives/edgar/full-index/${f.filing_date.substring(0, 4)}/${f.form_type}/${f.accession_number}.txt`
        })),
        source: "SEC EDGAR"
    };
}

/**
 * Tool: get_company_info
 * Get basic company information from SEC EDGAR.
 */
async function getCompanyInfo(params = {}) {
    const { company_name, cik } = params;

    if (!company_name && !cik) {
        return { error: "Either company_name or cik is required" };
    }

    let resolvedCik = cik;

    // Resolve CIK if only name is provided
    if (company_name && !cik) {
        const foundCik = await resolveNameToCIK(company_name);
        if (!foundCik) {
            return { error: `Could not resolve CIK for company: ${company_name}` };
        }
        resolvedCik = foundCik;
    }

    // Get company submissions data
    const submissions = await getCompanySubmissions(resolvedCik);
    if (!submissions) {
        return { error: `Could not retrieve company data for CIK: ${resolvedCik}` };
    }

    // Parse company info from submissions JSON
    const stateOfIncorporation = submissions?.stateOfIncorporation || submissions?.state_of_incorporation || '';
    const sicCode = submissions?.sic || '';
    const sicDescription = getSicDescription(sicCode);

    return {
        company_name: submissions.name || company_name || resolvedCik,
        cik: resolvedCik,
        sic_code: sicCode,
        sic_description: sicDescription,
        state_of_incorporation: stateOfIncorporation,
        fiscal_year_end: submissions.fiscalYearEnd || '',
        mailing_address: {
            street1: submissions.mailingAddress?.street1 || submissions.mail?.street1 || '',
            city: submissions.mailingAddress?.city || submissions.mail?.city || '',
            state: submissions.mailingAddress?.stateOrCountry || submissions.mail?.state || '',
            zip: submissions.mailingAddress?.zipCode || submissions.mail?.zipCode || ''
        },
        business_address: {
            street1: submissions.businessAddress?.street1 || submissions.business?.street1 || '',
            city: submissions.businessAddress?.city || submissions.business?.city || '',
            state: submissions.businessAddress?.stateOrCountry || submissions.business?.state || '',
            zip: submissions.businessAddress?.zipCode || submissions.business?.zipCode || ''
        },
        filings_count: (submissions?.filings?.recent?.accessionNumber || []).length,
        source: "SEC EDGAR"
    };
}

// ============================================
// SCORING FUNCTIONS
// ============================================

function calculateEntityRiskScore(data) {
    const { enforcementCount, litigationReleases = 0, totalFilings = 0 } = data;
    let score = 100;

    // Enforcement actions significantly impact score
    if (enforcementCount > 10) score -= 60;
    else if (enforcementCount > 5) score -= 40;
    else if (enforcementCount > 2) score -= 25;
    else if (enforcementCount > 0) score -= 10;

    // Litigation releases also impact score
    if (litigationReleases > 20) score -= 20;
    else if (litigationReleases > 10) score -= 10;
    else if (litigationReleases > 5) score -= 5;

    // Low filing count might indicate shell company or inactive entity
    if (totalFilings === 0) score -= 15;
    else if (totalFilings < 5) score -= 5;

    return Math.max(0, Math.min(100, score));
}

function getRiskLevel(score) {
    if (score >= 80) return "LOW";
    if (score >= 60) return "MEDIUM";
    if (score >= 40) return "HIGH";
    return "CRITICAL";
}

function buildEntityVerdict(riskLevel, enforcementCount, relatedPartiesCount) {
    if (riskLevel === "LOW") {
        return `Clean SEC regulatory record with ${enforcementCount} enforcement action(s) found. Entity has no major sanctions history.`;
    } else if (riskLevel === "MEDIUM") {
        return `Moderate SEC enforcement history with ${enforcementCount} enforcement action(s) found. Recommend additional KYC/AML screening before engagement.`;
    } else if (riskLevel === "HIGH") {
        return `Significant SEC enforcement history with ${enforcementCount} enforcement action(s) found. Entity presents elevated compliance risk — thorough due diligence required.`;
    } else {
        return `Critical SEC enforcement history with ${enforcementCount} enforcement action(s) found. Entity is high-risk — do not engage without senior compliance approval.`;
    }
}

/**
 * Map SIC code to human-readable description.
 */
function getSicDescription(sicCode) {
    const sicMap = {
        "1000": "Metal Mining",
        "2000": "Food and Kindred Products",
        "3000": "Rubber and Plastics",
        "4000": "Transportation",
        "5000": "Retail Trade",
        "6000": "Depository Institutions",
        "7000": "Hotels and Casinos",
        "8000": "Health Services",
        "9000": "Public Administration",
        "7370": "Computer Programming, Data Processing",
        "7372": "Prepackaged Software",
        "3570": "Computer Equipment",
        "3670": "Electronic Components",
        "4813": "Telephone Communications",
        "6099": "Nondeposit Trust Activities",
        "8741": "Management Consulting"
    };

    if (!sicCode) return "Unknown";
    const prefix = sicCode.toString().substring(0, 4);
    return sicMap[prefix] || `SIC ${sicCode}`;
}

// ============================================
// TOOL DISPATCHER
// ============================================

async function handleTool(toolName, params = {}) {
    const handlers = {
        "screen_entity": async () => screenEntity(params),
        "get_company_filings": async () => getCompanyFilings(params),
        "get_company_info": async () => getCompanyInfo(params)
    };

    const handler = handlers[toolName];
    if (!handler) {
        return { error: `Unknown tool: ${toolName}. Available tools: ${Object.keys(handlers).join(', ')}` };
    }

    const result = await handler();

    // Apply pay-per-event charging
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

// ============================================
// HTTP SERVER FOR STANDBY MODE (MCP)
// ============================================

await Actor.init();

const isStandby = Actor.config.get('metaOrigin') === 'STANDBY';

if (isStandby) {
    const PORT = Actor.config.get('containerPort') || process.env.ACTOR_WEB_SERVER_PORT || 3000;

    const server = http.createServer(async (req, res) => {
        // Handle readiness probe
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
            return;
        }

        // Handle MCP requests
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

                    // Standard MCP: initialize
                    if (method === 'initialize') {
                        return reply({
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {} },
                            serverInfo: { name: 'compliance-intelligence-mcp', version: '1.0.0' }
                        });
                    }

                    // Standard MCP: tools/list
                    if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
                        return reply({ tools: MCP_MANIFEST.tools });
                    }

                    // Standard MCP: tools/call
                    if (method === 'tools/call') {
                        const toolName = jsonBody.params?.name;
                        const toolArgs = jsonBody.params?.arguments || {};
                        if (!toolName) return replyError(-32602, 'Missing params.name');
                        const toolResult = await handleTool(toolName, toolArgs);
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    // Legacy: tools/{toolName} method format
                    if (method && method.startsWith('tools/')) {
                        const toolName = method.slice(6);
                        const toolArgs = jsonBody.params || {};
                        const toolResult = await handleTool(toolName, toolArgs);
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    // Legacy direct: {tool: "...", params: {...}}
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

        // Health check
        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'compliance-intelligence-mcp', version: '1.0.0' }));
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
    // Batch mode (apify call): run tool and exit
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

// Export handleRequest for MCP gateway compatibility
export default {
    handleRequest: async ({ request, log }) => {
        log.info("Compliance Intelligence MCP received request");

        try {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            const { tool, params = {} } = body;
            log.info(`Calling tool: ${tool}`);
            const result = await handleTool(tool, params);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            log.error(`Error: ${error.message}`);
            return { content: [{ type: 'text', text: JSON.stringify({ status: "error", error: error.message }, null, 2) }] };
        }
    }
};