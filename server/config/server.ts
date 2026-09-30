export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1339),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Strapi's built-in MCP server at POST /mcp; the 8 MatFinder tools are registered in src/mcp.
  mcp: { enabled: env.bool('MCP_ENABLED', true) },
});
