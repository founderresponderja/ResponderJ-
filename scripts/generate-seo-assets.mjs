import fs from 'fs';
import path from 'path';

const siteUrl = 'https://responder-ja.vercel.app';
const publicDir = path.join(process.cwd(), 'public');
const blogSlugs = [
  'como-responder-reviews-negativas-google',
  'seo-local-restaurantes-portugal',
  'automatizar-gestao-reputacao-online',
];

const publicPages = ['/', '/blog', '/about', '/privacy', '/terms', '/cookies'];
const urls = [...publicPages, ...blogSlugs.map((slug) => `/blog/${slug}`)];
const now = new Date().toISOString();

function ensurePublicDir() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
}

function generateSitemap() {
  const urlEntries = urls
    .map(
      (url) => `
  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url.startsWith('/blog/') ? 'monthly' : 'weekly'}</changefreq>
    <priority>${url === '/' ? '1.0' : url.startsWith('/blog/') ? '0.8' : '0.7'}</priority>
  </url>`,
    )
    .join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>
`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
}

function generateRobots() {
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /app/
Disallow: /invite/
Disallow: /convite/

Sitemap: ${siteUrl}/sitemap.xml
`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots, 'utf8');
}

ensurePublicDir();
generateSitemap();
generateRobots();
console.log('SEO assets generated: public/sitemap.xml and public/robots.txt');
