#!/usr/bin/env node
// spotlight-mcp — a Model Context Protocol server that exposes Spotlight to any AI
// client. Runs the @spotlight-rules engine (the spotlight-cli core) over stdio.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parse } from 'yaml';
import { lint, listRulesets, FORMATS } from './engine.mjs';

const FORMAT_ENUM = FORMATS;

const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: 'spotlight', version: '1.0.0' });

server.tool(
  'lint_artifact',
  'Lint an API artifact (OpenAPI, AsyncAPI, Arazzo, APIs.json, JSON Schema, …) with Spotlight and return governance findings (code, message, severity, path).',
  {
    content: z.string().describe('The API artifact as a YAML or JSON string.'),
    format: z.enum(FORMAT_ENUM).optional().describe('Artifact format; selects the default ruleset when none is given.'),
    ruleset: z.any().optional().describe('A ruleset alias ("spotlight:oas") or a ruleset definition object. Defaults to the built-in ruleset for the format.'),
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
  'List the built-in Spotlight rulesets (spotlight:oas, spotlight:asyncapi, spotlight:arazzo) and the rules each contains.',
  {},
  async () => text({ rulesets: listRulesets() }),
);

server.tool(
  'list_formats',
  'List the artifact formats Spotlight can lint.',
  {},
  async () => text({ formats: FORMATS }),
);

server.tool(
  'validate_ruleset',
  'Structurally validate a Spotlight ruleset (alias, definition object, or YAML/JSON string) against the engine.',
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

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr only — stdout is the MCP channel.
console.error('spotlight-mcp ready (stdio)');
