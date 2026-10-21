/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node server in the image (`node server.js`); static export can't serve the dynamic
  // App Router pages (/repos/[facility]/[name], /facilities/[name]) or the dev /graphql proxy.
  output: "standalone",
  // The legacy class components were never written for StrictMode's double effects.
  reactStrictMode: false,
  // /graphql in local development is handled by src/proxy.js (runtime env, dev identity).

  // Old URLs → their redesigned homes (spec §6 "Routes"). Permanent once the old pages are gone.
  async redirects() {
    return [
      { source: "/repos", destination: "/repos/info", permanent: false },
      { source: "/repos/compute", destination: "/repos/info?view=compute", permanent: false },
      { source: "/repos/storage", destination: "/repos/info?view=storage", permanent: false },
      { source: "/repos/users", destination: "/repos/info", permanent: false },
      { source: "/repos/groups", destination: "/repos/info", permanent: false },
      { source: "/repos/audit", destination: "/repos/info", permanent: false },
      { source: "/repos/users/:facility/:name", destination: "/repos/:facility/:name/members", permanent: false },
      { source: "/repos/groups/:facility/:name", destination: "/repos/:facility/:name/groups", permanent: false },
      { source: "/repos/audit/:facility/:name", destination: "/repos/:facility/:name/history", permanent: false },
      { source: "/repos/features/:facility/:name", destination: "/repos/:facility/:name/features", permanent: false },
      { source: "/repos/compute/:facility/:name/allocation/:id", destination: "/repos/:facility/:name/compute/:id", permanent: false },
      { source: "/repos/storage/:facility/:name/allocation/:id", destination: "/repos/:facility/:name/storage/:id", permanent: false },
      { source: "/next/repos", destination: "/repos/info", permanent: false },
      { source: "/next/clusterusage/:name", destination: "/clusterusage/:name", permanent: false },
      { source: "/next/compat", destination: "/dev/compat", permanent: false },
    ];
  },
};

export default nextConfig;
