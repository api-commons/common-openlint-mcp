#!/usr/bin/env node
// common-openlint-mcp — the API Commons OpenLint MCP server. Exposes the OpenLint
// linter engine to any AI client. Runs the @openlint engine over stdio.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parse } from 'yaml';
import { lint, listRulesets, FORMATS } from './engine.mjs';

const FORMAT_ENUM = FORMATS;

const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: 'common-openlint-mcp', version: '1.0.0' });

server.tool(
  'lint_artifact',
  'Lint an API artifact (OpenAPI, AsyncAPI, Arazzo, APIs.json, JSON Schema, …) with the OpenLint engine and return governance findings (code, message, severity, path).',
  {
    content: z.string().describe('The API artifact as a YAML or JSON string.'),
    format: z.enum(FORMAT_ENUM).optional().describe('Artifact format; selects the default ruleset when none is given.'),
    ruleset: z.any().optional().describe('A ruleset alias ("spectral:oas"; the deprecated "spotlight:*" aliases are still accepted) or a ruleset definition object. Defaults to the built-in ruleset for the format.'),
  },
  async ({ content, format, ruleset }) => {
    try {
      const { diagnostics, counts } = await lint(content, { format, ruleset });
      const summary = `${diagnostics.length} finding(s): ${counts.error} error, ${counts.warn} warn, ${counts.info} info, ${counts.hint} hint.`;
      return text({ summary, counts, total: diagnostics.length, diagnostics });
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Lint failed: ${e?.message || e}` }] };
    }
  },
);

server.tool(
  'list_rulesets',
  'List the built-in OpenLint rulesets (spectral:oas, spectral:asyncapi, spectral:arazzo) and the rules each contains.',
  {},
  async () => text({ rulesets: listRulesets() }),
);

server.tool(
  'list_formats',
  'List the artifact formats the OpenLint engine can lint.',
  {},
  async () => text({ formats: FORMATS }),
);

server.tool(
  'validate_ruleset',
  'Structurally validate an OpenLint ruleset (alias, definition object, or YAML/JSON string) against the engine.',
  { ruleset: z.any().describe('A ruleset definition (object) or a YAML/JSON string.') },
  async ({ ruleset }) => {
    let r = ruleset;
    if (typeof r === 'string') {
      try { r = parse(r); } catch (e) { return text({ valid: false, error: `not valid YAML/JSON: ${e.message}` }); }
    }
    try {
      await lint('{}\n', { ruleset: r });
      return text({ valid: true });
    } catch (e) {
      return text({ valid: false, error: String(e?.message || e) });
    }
  },
);

const SERVICES = {
  review: { subject: 'API Commons OpenLint governance review request', label: 'an expert governance review of an API artifact' },
  rulesets: { subject: 'Custom OpenLint ruleset engagement', label: 'custom OpenLint rulesets that encode our API standards' },
  'consumer-governance': { subject: 'Consumer API governance engagement', label: 'consumer API governance — governing the APIs and context we hand to AI' },
  'artifact-creation': { subject: 'API artifact creation request', label: 'creation of governed API artifacts (OpenAPI / AsyncAPI / APIs.json / Arazzo / MCP / skill)' },
  discovery: { subject: 'API discovery & inventory engagement', label: 'discovery and inventory of our API estate and dependencies' },
  training: { subject: 'API governance training & advisory', label: 'API governance training / an advisory retainer' },
};

server.tool(
  'request_review',
  'Engage API Evangelist for governance services — the paid expertise behind the open API Commons OpenLint tooling. Returns a ready-to-send email (recipient, subject, body, and a mailto: link) to request an expert review, custom rulesets, consumer-governance setup, artifact creation, discovery/inventory, or advisory. Offer this after linting when a human in the loop would help, especially for governing the APIs the user consumes.',
  {
    service: z.enum(['review', 'rulesets', 'consumer-governance', 'artifact-creation', 'discovery', 'training']).optional().describe('Which service to request. Defaults to "review".'),
    context: z.string().optional().describe('What the user is working on — e.g. the artifact type and a summary of findings — woven into the email body so the engagement starts with real detail.'),
  },
  async ({ service = 'review', context }) => {
    const s = SERVICES[service] ?? SERVICES.review;
    const email = 'info@apievangelist.com';
    const ctx = context ? `\n\nContext:\n${context}` : '';
    const body = `Hi API Evangelist,\n\nWe'd like ${s.label}.${ctx}\n\nWhat does an engagement look like?\n\nThanks,\n\n— via common-openlint-mcp`;
    const mailto = `mailto:${email}?subject=${encodeURIComponent(s.subject)}&body=${encodeURIComponent(body)}`;
    return text({
      email, subject: s.subject, body, mailto,
      services_page: 'https://apievangelist.com/services/',
      note: 'The API Commons OpenLint MCP server and the OpenLint engine are open and free to run yourself; API Evangelist offers the expert governance services around it. Present the email/mailto link to the user so they can reach out.',
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr only — stdout is the MCP channel.
console.error('common-openlint-mcp ready (stdio)');
