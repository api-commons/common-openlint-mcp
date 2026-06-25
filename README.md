<p align="center"><a href="https://spotlight-rules.com"><img src="https://raw.githubusercontent.com/api-commons/spotlight-mcp/main/spotlight-rules-logo.png" alt="Spotlight Rules" height="90"></a></p>

# Spotlight MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
[Spotlight](https://spotlight-rules.com) to **any AI client** — so an agent can lint
your API artifacts and work with rulesets conversationally. It runs the same
`@spotlight-rules/*` engine as [spotlight-cli](https://github.com/api-commons/spotlight-cli),
over stdio.

## Tools

| Tool | What it does |
| --- | --- |
| `lint_artifact` | Lint an artifact (`content`, optional `format`, optional `ruleset`) → findings (code, message, severity, path) + counts |
| `list_rulesets` | The built-in rulesets (`spotlight:oas`, `:asyncapi`, `:arazzo`) and their rules |
| `list_formats` | The artifact formats Spotlight can lint |
| `validate_ruleset` | Structurally validate a ruleset (alias, object, or YAML/JSON string) |

## Use it

```bash
npm install
npm start          # speaks MCP over stdio
```

### Claude Desktop / any MCP client

Add to your client's MCP server config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spotlight": {
      "command": "npx",
      "args": ["-y", "@spotlight-rules/spotlight-mcp"]
    }
  }
}
```

Then ask: *"Lint this OpenAPI with Spotlight and tell me what to fix."*

## Part of the Spotlight suite

One engine (the CLI), one vocabulary (the spec + its rule tags): **spec** · **cli** ·
**api** (HTTP) · **mcp** (AI, this repo) · **vscode** · **validator**. Where
[spotlight-api](https://github.com/api-commons/spotlight-api) is the HTTP surface,
this is the AI surface.

---

Part of [Spotlight Rules](https://spotlight-rules.com) — a project of [API Evangelist](https://apievangelist.com), maintained openly under [API Commons](https://apicommons.org). Apache-2.0.
