/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site to out/ for S3 + CloudFront hosting.
  output: 'export',
  // Each route emits route/index.html, which the CloudFront URI-rewrite
  // function maps deep links onto.
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
