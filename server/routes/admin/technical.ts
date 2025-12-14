import type { Express } from "express";
import { requireAuth } from "../../auth";
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import process from 'process';

export function setupTechnicalSpecsRoutes(app: Express) {
  // Middleware para verificar se é admin
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      // Compatibilidade com Passport (req.user.id) e Replit Auth (req.user.claims.sub)
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verificar flag de admin ou super admin
      if (!user.isAdmin && !user.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado: Apenas administradores" });
      }
      
      next();
    } catch (error) {
      console.error("Erro na verificação de admin:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  };

  // Endpoint para obter especificações técnicas
  app.get("/api/admin/technical-specs", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const specs = {
        version: "2.6.0",
        buildNumber: "20250827.1",
        lastUpdated: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        platform: "replit",
        technologies: {
          frontend: {
            react: "18.2.0",
            typescript: "5.3.3",
            vite: "5.1.0",
            tailwindcss: "3.4.0"
          },
          backend: {
            nodejs: process.version,
            express: "5.2.1",
            typescript: "5.3.3",
            drizzle: "0.29.0"
          },
          database: {
            postgresql: "15.4",
            neon: "Serverless",
            hosting: "Neon Database"
          },
          external: {
            ai: "Google Gemini 2.5 Flash",
            stripe: "API 2025-07-30",
            sendgrid: "7.7.0"
          }
        }
      };
      
      res.json(specs);
    } catch (error) {
      console.error("Erro ao obter especificações técnicas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para download de código fonte
  app.get("/api/admin/download-source/:type", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['frontend', 'backend', 'mobile', 'database', 'full'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Tipo de download inválido" });
      }

      const archive = archiver('zip', {
        zlib: { level: 9 } // Compression level
      });

      const filename = `responder-ja-${type}-${new Date().toISOString().split('T')[0]}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      archive.pipe(res);

      const rootDir = process.cwd();

      switch (type) {
        case 'frontend':
          await addFrontendFiles(archive, rootDir);
          break;
        case 'backend':
          await addBackendFiles(archive, rootDir);
          break;
        case 'mobile':
          await addMobileFiles(archive, rootDir);
          break;
        case 'database':
          await addDatabaseFiles(archive, rootDir);
          break;
        case 'full':
          await addAllFiles(archive, rootDir);
          break;
      }

      // Add README for the download
      const readmeContent = generateReadme(type);
      archive.append(readmeContent, { name: 'README.md' });

      await archive.finalize();
    } catch (error) {
      console.error("Erro no download do código fonte:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });
}

async function addFrontendFiles(archive: archiver.Archiver, rootDir: string) {
  // Assuming standard Replit structure where client/ is typically at root or src/
  // Adjusting for current project structure where everything seems to be in root or dedicated folders
  
  // Add components
  if (fs.existsSync(path.join(rootDir, 'components'))) {
    archive.directory(path.join(rootDir, 'components'), 'components');
  }
  
  // Add public assets
  if (fs.existsSync(path.join(rootDir, 'public'))) {
    archive.directory(path.join(rootDir, 'public'), 'public');
  } else if (fs.existsSync(path.join(rootDir, 'client', 'public'))) {
     archive.directory(path.join(rootDir, 'client', 'public'), 'public');
  }
  
  // Configuration files
  const configFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'index.html',
    'App.tsx',
    'main.tsx',
    'index.css'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
    }
  });
}

async function addBackendFiles(archive: archiver.Archiver, rootDir: string) {
  const serverDir = path.join(rootDir, 'server');
  
  if (fs.existsSync(serverDir)) {
    archive.directory(serverDir, 'server');
  }
  
  // Shared schema if exists outside server
  const sharedDir = path.join(rootDir, 'shared');
  if (fs.existsSync(sharedDir)) {
    archive.directory(sharedDir, 'shared');
  }
  
  // Config files
  const configFiles = [
    'package.json',
    'drizzle.config.ts',
    'tsconfig.json'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
    }
  });
}

async function addMobileFiles(archive: archiver.Archiver, rootDir: string) {
  const mobileDir = path.join(rootDir, 'mobile');
  
  if (fs.existsSync(mobileDir)) {
    archive.directory(mobileDir, 'mobile');
  } else {
    // Create mock mobile project structure as placeholder
    const mockAndroid = `# Responder Já - Android App\n\nPlaceholder for Android Project Structure.`;
    const mockiOS = `# Responder Já - iOS App\n\nPlaceholder for iOS Project Structure.`;
    
    archive.append(mockAndroid, { name: 'mobile/android/README.md' });
    archive.append(mockiOS, { name: 'mobile/ios/README.md' });
  }
}

async function addDatabaseFiles(archive: archiver.Archiver, rootDir: string) {
  const sharedDir = path.join(rootDir, 'shared');
  if (fs.existsSync(sharedDir)) {
    archive.directory(sharedDir, 'shared');
  }
  
  const drizzleConfig = path.join(rootDir, 'drizzle.config.ts');
  if (fs.existsSync(drizzleConfig)) {
    archive.file(drizzleConfig, { name: 'drizzle.config.ts' });
  }
  
  const dbSetupScript = `-- Responder Já Database Setup\n-- PostgreSQL 15.4\n\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS "pg_trgm";`;
  archive.append(dbSetupScript, { name: 'database-setup.sql' });
}

async function addAllFiles(archive: archiver.Archiver, rootDir: string) {
  const excludePatterns = ['node_modules', '.git', '.env', 'dist', 'build', '.replit', 'replit.nix'];
  
  const addDirectoryRecursive = (dirPath: string, archivePath: string) => {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      if (excludePatterns.some(pattern => item.includes(pattern))) return;
      
      const fullPath = path.join(dirPath, item);
      const archiveItemPath = archivePath ? path.join(archivePath, item) : item;
      
      // Skip hidden files/dirs
      if (item.startsWith('.')) return;

      if (fs.statSync(fullPath).isDirectory()) {
        addDirectoryRecursive(fullPath, archiveItemPath);
      } else {
        archive.file(fullPath, { name: archiveItemPath });
      }
    });
  };
  
  addDirectoryRecursive(rootDir, '');
}

function generateReadme(type: string): string {
  return `# Responder Já - Download ${type.toUpperCase()}\n\nData: ${new Date().toLocaleDateString()}\n\nEste arquivo contém o código fonte solicitado.\n\n⚠️ Mantenha este código seguro e não partilhe credenciais.`;
}