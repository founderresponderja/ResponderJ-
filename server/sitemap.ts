import { SitemapStream, streamToPromise } from 'sitemap';
import fs from 'fs';
import path from 'path';

// URLs principais da aplicação
const urls = [
  {
    url: '/',
    changefreq: 'weekly',
    priority: 1.0,
    lastmod: new Date().toISOString()
  },
  {
    url: '/saber-mais',
    changefreq: 'monthly',
    priority: 0.9,
    lastmod: new Date().toISOString()
  },
  {
    url: '/about',
    changefreq: 'monthly',
    priority: 0.8,
    lastmod: new Date().toISOString()
  },
  {
    url: '/auth',
    changefreq: 'yearly',
    priority: 0.7,
    lastmod: new Date().toISOString()
  },
  {
    url: '/dashboard',
    changefreq: 'daily',
    priority: 0.9,
    lastmod: new Date().toISOString()
  },
  {
    url: '/generate-response',
    changefreq: 'weekly',
    priority: 0.9,
    lastmod: new Date().toISOString()
  },
  {
    url: '/business/crm',
    changefreq: 'weekly',
    priority: 0.8,
    lastmod: new Date().toISOString()
  },
  {
    url: '/business/leads',
    changefreq: 'weekly',
    priority: 0.8,
    lastmod: new Date().toISOString()
  },
  {
    url: '/analytics',
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date().toISOString()
  },
  {
    url: '/reports',
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date().toISOString()
  },
  {
    url: '/social-media',
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date().toISOString()
  },
  {
    url: '/teams',
    changefreq: 'monthly',
    priority: 0.6,
    lastmod: new Date().toISOString()
  },
  {
    url: '/billing',
    changefreq: 'monthly',
    priority: 0.6,
    lastmod: new Date().toISOString()
  },
  // Páginas legais
  {
    url: '/termos-condicoes',
    changefreq: 'yearly',
    priority: 0.4,
    lastmod: new Date().toISOString()
  },
  {
    url: '/politica-privacidade',
    changefreq: 'yearly',
    priority: 0.4,
    lastmod: new Date().toISOString()
  },
  {
    url: '/cookies',
    changefreq: 'yearly',
    priority: 0.3,
    lastmod: new Date().toISOString()
  }
];

// Criar sitemap stream
const sitemapStream = new SitemapStream({ hostname: 'https://responderja.pt' });

// Gerar ficheiro sitemap.xml
export async function generateSitemap() {
  try {
    // Nota: Em produção, process.cwd() geralmente aponta para a raiz do projeto.
    // Ajuste o caminho 'dist/public' conforme a estrutura de build real do seu servidor.
    const sitemapPath = path.join((process as any).cwd(), 'dist', 'public', 'sitemap.xml');
    
    // Criar diretório se não existir
    const dir = path.dirname(sitemapPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Adicionar URLs ao stream
    urls.forEach(url => sitemapStream.write(url));
    sitemapStream.end();
    
    // Converter stream para string
    const sitemapXML = await streamToPromise(sitemapStream);
    
    // Escrever sitemap
    fs.writeFileSync(sitemapPath, sitemapXML.toString());
    console.log('✅ Sitemap gerado em:', sitemapPath);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar sitemap:', error);
    return false;
  }
}

// Gerar robots.txt
export function generateRobots() {
  try {
    const robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth
Disallow: /.well-known/
Disallow: /private/
Disallow: /temp/

# Sitemap
Sitemap: https://responderja.pt/sitemap.xml

# Crawl-delay para bots mais agressivos
User-agent: Baiduspider
Crawl-delay: 2

User-agent: YandexBot
Crawl-delay: 2

# Google Analytics e Search Console
User-agent: Googlebot
Allow: /
Crawl-delay: 1`;

    const robotsPath = path.join((process as any).cwd(), 'dist', 'public', 'robots.txt');
    
    // Criar diretório se não existir
    const dir = path.dirname(robotsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(robotsPath, robotsContent);
    console.log('✅ Robots.txt gerado em:', robotsPath);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar robots.txt:', error);
    return false;
  }
}

// Executar se chamado diretamente
// Em ESM, import.meta.url é o caminho do ficheiro.
// Comparamos com process.argv[1] convertendo para formato de ficheiro se necessário.
if (import.meta.url && (process as any).argv[1] === import.meta.url.replace('file://', '')) {
  (async () => {
    await generateSitemap();
    generateRobots();
  })();
}