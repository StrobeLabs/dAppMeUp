/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["firebasestorage.googleapis.com", "images.jokerace.io"],
    remotePatterns: [{ hostname: "**" }],
  },
};

module.exports = nextConfig;
