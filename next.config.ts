import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A self-contained server bundle so the Docker image can be small and the app
  // can be deployed to a plain VPS as well as a serverless host.
  output: 'standalone',
  // The database drivers are Node-only; keep them out of the bundler.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  poweredByHeader: false,
};

export default nextConfig;
