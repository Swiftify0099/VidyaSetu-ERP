interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Cloudflare Workers Static Assets handler
    // Serves static files from ./dist with SPA single-page-application fallback
    return env.ASSETS.fetch(request);
  },
};
