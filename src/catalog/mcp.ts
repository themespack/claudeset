import type { McpServer } from "../mcp/index.js";

/** What has to be on PATH for a server to start. */
export type Runtime = "node" | "uv" | "docker";

export interface McpEntry {
  id: string;
  title: string;
  /** One line, shown in the picker. */
  description: string;
  server: McpServer;
  runtime: Runtime;
  /** Environment variables the user must set themselves — never written by claudeset. */
  requiresEnv?: Array<{ name: string; hint: string }>;
  /** Anything surprising: auth flow, archived upstream, placeholder args. */
  note?: string;
}

const npx = (...args: string[]): McpServer => ({ command: "npx", args: ["-y", ...args] });
const uvx = (...args: string[]): McpServer => ({ command: "uvx", args });

/**
 * Curated MCP servers. Commands were verified against the registry; `{{root}}` in
 * an argument is replaced with the project root when the server is installed.
 */
export const MCP_CATALOG: McpEntry[] = [
  {
    id: "filesystem",
    title: "Filesystem",
    description: "Read and write files under an allow-listed directory.",
    server: npx("@modelcontextprotocol/server-filesystem", "{{root}}"),
    runtime: "node",
    note: "Scoped to the project root. Add more paths by editing args.",
  },
  {
    id: "git",
    title: "Git",
    description: "Inspect history, diffs and branches of a local repository.",
    server: uvx("mcp-server-git", "--repository", "{{root}}"),
    runtime: "uv",
  },
  {
    id: "github",
    title: "GitHub",
    description: "Issues, pull requests, code search and releases on GitHub.",
    server: npx("@modelcontextprotocol/server-github"),
    runtime: "node",
    requiresEnv: [
      { name: "GITHUB_PERSONAL_ACCESS_TOKEN", hint: "repo scope; fine-grained tokens work" },
    ],
    note: "GitHub also hosts a remote server at https://api.githubcopilot.com/mcp/ (OAuth).",
  },
  {
    id: "context7",
    title: "Context7",
    description: "Up-to-date documentation and code examples for libraries.",
    server: npx("@upstash/context7-mcp"),
    runtime: "node",
  },
  {
    id: "fetch",
    title: "Fetch",
    description: "Fetch a URL and hand it to the agent as clean markdown.",
    server: uvx("mcp-server-fetch"),
    runtime: "uv",
  },
  {
    id: "memory",
    title: "Memory",
    description: "Knowledge-graph memory that persists across sessions.",
    server: npx("@modelcontextprotocol/server-memory"),
    runtime: "node",
  },
  {
    id: "sequential-thinking",
    title: "Sequential Thinking",
    description: "Structured step-by-step reasoning for hard problems.",
    server: npx("@modelcontextprotocol/server-sequential-thinking"),
    runtime: "node",
  },
  {
    id: "playwright",
    title: "Playwright",
    description: "Drive a real browser: click, type, screenshot, read the DOM.",
    server: npx("@playwright/mcp@latest"),
    runtime: "node",
  },
  {
    id: "postgres",
    title: "PostgreSQL",
    description: "Query a Postgres database and inspect its schema.",
    server: uvx("postgres-mcp", "--access-mode=restricted"),
    runtime: "uv",
    requiresEnv: [{ name: "DATABASE_URI", hint: "postgres://user:pass@host:5432/db" }],
    note: "Starts read-only; drop --access-mode=restricted to allow writes.",
  },
  {
    id: "docker",
    title: "Docker",
    description: "List, inspect, start and stop containers and images.",
    server: npx("mcp-server-docker"),
    runtime: "docker",
  },
  {
    id: "cloudflare",
    title: "Cloudflare",
    description: "Cloudflare documentation search over the hosted remote server.",
    server: npx("mcp-remote", "https://docs.mcp.cloudflare.com/sse"),
    runtime: "node",
    note: "Other Cloudflare servers (bindings, observability) need an OAuth login.",
  },
  {
    id: "openapi",
    title: "OpenAPI",
    description: "Turn an OpenAPI/Swagger spec into callable tools.",
    server: npx("openapi-mcp-server", "{{root}}/openapi.json"),
    runtime: "node",
    note: "Point the argument at your own spec file or URL.",
  },
  {
    id: "prisma",
    title: "Prisma",
    description: "Manage Prisma schema, migrations and Postgres databases.",
    server: npx("prisma", "mcp"),
    runtime: "node",
  },
  {
    id: "brave-search",
    title: "Brave Search",
    description: "Web and local search through the Brave Search API.",
    server: npx("@modelcontextprotocol/server-brave-search"),
    runtime: "node",
    requiresEnv: [{ name: "BRAVE_API_KEY", hint: "free tier at brave.com/search/api" }],
  },
  {
    id: "tavily",
    title: "Tavily",
    description: "Search and page extraction tuned for agents.",
    server: npx("tavily-mcp"),
    runtime: "node",
    requiresEnv: [{ name: "TAVILY_API_KEY", hint: "tavily.com dashboard" }],
  },
];

export function findMcp(id: string): McpEntry | undefined {
  return MCP_CATALOG.find((e) => e.id === id);
}

/** Substitute `{{root}}` in the server arguments. */
export function resolveServer(entry: McpEntry, root: string): McpServer {
  const args = entry.server.args?.map((a) => a.replace(/\{\{root\}\}/g, root));
  return args ? { ...entry.server, args } : { ...entry.server };
}
