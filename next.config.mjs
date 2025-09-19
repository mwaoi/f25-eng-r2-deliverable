/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true }, // ✅ don’t fail builds on ESLint
  // If you’re still tightening types, you can also bypass TS errors in CI:
  // typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" }, // only if you used Unsplash
    ],
  },
};
export default nextConfig;
