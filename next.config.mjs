/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: [
      "@azure/identity",
      "@azure/arm-resourcegraph",
      "@azure/arm-costmanagement",
      "@azure/arm-security",
      "@azure/arm-advisor",
      "@azure/arm-monitor",
      "@azure/arm-resources",
      "@azure/arm-resourcehealth",
      "@prisma/client",
      "@react-pdf/renderer",
    ],
  },
};

export default nextConfig;
