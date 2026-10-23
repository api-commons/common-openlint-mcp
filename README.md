# API Commons OpenLint MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server from
[API Commons](https://apicommons.org) that exposes the [OpenLint](https://openlint.org)
linter engine to **any AI client** — so an agent can lint your API artifacts and work
with rulesets conversationally. It runs the `@openlint/*` engine (the same one behind the
[`openlint`](https://www.npmjs.com/package/openlint) CLI) over stdio.

## Tools

| Tool | What it does |
| --- | --- |
| `lint_artifact` | Lint an artifact (`content`, optional `format`, optional `ruleset`) → findings (code, message, severity, path) + counts |
| `list_rulesets` | The built-in rulesets (`spectral:oas`, `:asyncapi`, `:arazzo`) and their rules |
| `list_formats` | The artifact formats the OpenLint engine can lint |
| `validate_ruleset` | Structurally validate a ruleset (alias, object, or YAML/JSON string) |

The old `spotlight:oas`, `spotlight:asyncapi` and `spotlight:arazzo` aliases are still
accepted as deprecated aliases for the `spectral:*` names.

## Use it

```bash
npm install
npm start          # speaks MCP over stdio
```

### Claude Desktop / any MCP client

Add to your client's MCP server config (e.g. Claude Desktop `claude_desktop_config.json`),
pointing at a local checkout:

```json
{
  "mcpServers": {
    "common-openlint-mcp": {
      "command": "node",
      "args": ["/path/to/common-openlint-mcp/src/server.mjs"]
    }
  }
}
```

Then ask: *"Lint this OpenAPI with OpenLint and tell me what to fix."*

## Related

- [OpenLint](https://github.com/openlint/openlint) — the linter engine and the `openlint` CLI ([spec](https://spec.openlint.org))
- [common-openlint-api](https://github.com/api-commons/common-openlint-api) — the HTTP surface; this repo is the AI surface
- [common-openlint-validator](https://github.com/api-commons/common-openlint-validator) — the browser validator ([validator.apicommons.org](https://validator.apicommons.org))
- [common-openlint-pipeline](https://github.com/api-commons/common-openlint-pipeline)
- [API Commons rules](https://apicommons.org/rules/)

---

A project of [API Evangelist](https://apievangelist.com), maintained openly under [API Commons](https://apicommons.org). Apache-2.0.
