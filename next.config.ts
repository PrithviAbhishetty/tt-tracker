import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // In development, the SW would interfere with HMR; only register in prod.
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
