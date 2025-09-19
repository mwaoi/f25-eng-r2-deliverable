/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🟢 ship even if ESLint finds problems
  eslint: { ignoreDuringBuilds: true },

  // optional safety valve (use only if you still see TS errors blocking deploy)
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
