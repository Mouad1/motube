import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 est un module natif Node.js — le passer en external
  serverExternalPackages: ["better-sqlite3"],
  // Turbopack (Next.js 16 default) — pas de config webpack nécessaire
  turbopack: {},
};

export default nextConfig;
