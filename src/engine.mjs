// OpenLint engine wrapper for the API Commons OpenLint MCP server. Builds a Ruleset
// from a (data-form) definition or a built-in alias, then lints a document — the same
// approach the browser validator uses, server-side. Core comes from the published
// @openlint packages (the OpenLint engine, https://openlint.org).
import { OpenLint, Document, Ruleset } from '@openlint/openlint-core';
import { Yaml } from '@openlint/openlint-parsers';
import { oas, asyncapi, arazzo } from '@openlint/openlint-rulesets';
import * as fns from '@openlint/openlint-functions';
import * as fmts from '@openlint/openlint-formats';

// Built-in rulesets, referenced by alias.
export const BUILTIN_RULESETS = {
  'spectral:oas': oas,
  'spectral:asyncapi': asyncapi,
  'spectral:arazzo': arazzo,
};

// Deprecated aliases from the retired Spotlight fork — still accepted as input so
// existing client configurations keep working. Not listed by list_rulesets.
const DEPRECATED_ALIASES = {
  'spotlight:oas': 'spectral:oas',
  'spotlight:asyncapi': 'spectral:asyncapi',
  'spotlight:arazzo': 'spectral:arazzo',
};
const resolveAlias = (name) => BUILTIN_RULESETS[DEPRECATED_ALIASES[name] ?? name];

// Map a format string to the built-in ruleset alias.
const FORMAT_RULESET = { openapi: 'spectral:oas', asyncapi: 'spectral:asyncapi', arazzo: 'spectral:arazzo' };

const FORMAT_ALIASES = { 'oas3.0': 'oas3_0', 'oas3.1': 'oas3_1', 'json-schema': 'jsonSchema', jsonschema: 'jsonSchema' };
const lookupFormat = (name) => fmts[FORMAT_ALIASES[name] ?? name] ?? fmts[name];

// Convert a data-form ruleset (string functions/formats) into the JS form Ruleset expects.
function toJsForm(node) {
  if (Array.isArray(node)) return node.map(toJsForm);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'function' && typeof v === 'string') out[k] = fns[v] ?? v;
      else if (k === 'formats' && Array.isArray(v)) out[k] = v.map((f) => (typeof f === 'string' ? lookupFormat(f) : f)).filter(Boolean);
      else out[k] = toJsForm(v);
    }
    return out;
  }
  return node;
}

function resolveExtends(ext) {
  if (ext == null) return undefined;
  const list = Array.isArray(ext) ? ext : [ext];
  return list.map((e) => {
    if (typeof e === 'string') return resolveAlias(e) ?? e;
    if (Array.isArray(e) && typeof e[0] === 'string') return [resolveAlias(e[0]) ?? e[0], e[1]];
    return e;
  });
}

// Build a Ruleset from: an alias string, a {extends?, rules?} definition object, or
// (default) the built-in ruleset for `format`.
function buildRuleset(ruleset, format) {
  if (!ruleset) {
    const alias = FORMAT_RULESET[format] || 'spectral:oas';
    return new Ruleset({ extends: [[BUILTIN_RULESETS[alias], 'recommended']] }, { source: 'common-openlint-mcp' });
  }
  if (typeof ruleset === 'string') {
    const rs = resolveAlias(ruleset);
    if (!rs) throw new Error(`unknown ruleset alias: ${ruleset}`);
    return new Ruleset({ extends: [[rs, 'recommended']] }, { source: 'common-openlint-mcp' });
  }
  const { extends: ext, ...rest } = ruleset;
  const jsRest = toJsForm(rest);
  const resolved = resolveExtends(ext);
  return new Ruleset(resolved ? { ...jsRest, extends: resolved } : jsRest, { source: 'common-openlint-mcp' });
}

const engine = new OpenLint();
const SEV = ['error', 'warn', 'info', 'hint'];

/** Lint `content` (YAML or JSON string). Returns { diagnostics, counts }. */
export async function lint(content, { ruleset, format, source = 'artifact' } = {}) {
  engine.setRuleset(buildRuleset(ruleset, format));
  const results = await engine.run(new Document(content, Yaml, source));
  const diagnostics = results.map((d) => ({
    code: String(d.code),
    message: d.message,
    severity: SEV[d.severity] ?? 'warn',
    path: Array.isArray(d.path) ? d.path.join('.') : undefined,
    range: d.range,
  }));
  const counts = { error: 0, warn: 0, info: 0, hint: 0 };
  for (const d of diagnostics) counts[d.severity] = (counts[d.severity] ?? 0) + 1;
  return { diagnostics, counts };
}

/** List the built-in rulesets and the rules they contain. */
export function listRulesets() {
  return Object.entries(BUILTIN_RULESETS).map(([alias, rs]) => ({
    alias,
    rules: Object.keys(rs?.rules ?? {}).filter((n) => !/^oas2[-_]/i.test(n)),
  }));
}

export const FORMATS = ['openapi', 'asyncapi', 'arazzo', 'json-schema', 'apis-json', 'json-structure', 'json-ld', 'plans', 'rate-limits', 'finops', 'mcp'];
