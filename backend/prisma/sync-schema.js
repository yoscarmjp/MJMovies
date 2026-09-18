import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function resolveProvider() {
  const envProvider = (process.env.DB_PROVIDER || '').trim().toLowerCase();
  const dbUrl = (process.env.DATABASE_URL || '').trim();

  if (envProvider === 'sqlite' || (!envProvider && dbUrl.startsWith('file:'))) {
    return 'sqlite';
  }
  if (envProvider === 'mysql' || (!envProvider && dbUrl.startsWith('mysql:'))) {
    return 'mysql';
  }
  return 'sqlite';
}

export function syncSchema() {
  const provider = resolveProvider();
  const templateName = `schema.${provider}.prisma`;
  const templatePath = path.join(__dirname, templateName);
  const activeSchemaPath = path.join(__dirname, 'schema.prisma');

  if (!fs.existsSync(templatePath)) {
    console.error(`[DB Sync] No se encontró la plantilla de esquema: ${templateName}`);
    process.exit(1);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  let activeContent = '';
  if (fs.existsSync(activeSchemaPath)) {
    activeContent = fs.readFileSync(activeSchemaPath, 'utf-8');
  }

  const needsSchemaUpdate = templateContent.trim() !== activeContent.trim();

  if (needsSchemaUpdate) {
    console.log(`[DB Sync] Cambiando esquema activo a: ${provider.toUpperCase()}...`);
    fs.writeFileSync(activeSchemaPath, templateContent, 'utf-8');
    console.log(`[DB Sync] Regenerando Prisma Client para ${provider}...`);
    try {
      execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
      console.log(`[DB Sync] Prisma Client generado para ${provider.toUpperCase()}.`);
    } catch (err) {
      console.error('[DB Sync] Error generando Prisma Client:', err.message);
      process.exit(1);
    }
  }

  if (provider === 'sqlite') {
    let dbUrl = (process.env.DATABASE_URL || '').trim();
    if (!dbUrl.startsWith('file:')) {
      dbUrl = 'file:./mjmovies.db';
      process.env.DATABASE_URL = dbUrl;
    }

    const relativeDbFile = dbUrl.replace(/^file:/, '');
    const resolvedDbPath = path.isAbsolute(relativeDbFile)
      ? relativeDbFile
      : path.resolve(__dirname, relativeDbFile);

    const dbExists = fs.existsSync(resolvedDbPath) && fs.statSync(resolvedDbPath).size > 0;

    try {
      execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } });
    } catch (gErr) {
      console.error('[DB Sync] Error en prisma generate:', gErr.message);
    }

    if (!dbExists || needsSchemaUpdate) {
      console.log(`[DB Sync] Sincronizando tablas en SQLite (${path.basename(resolvedDbPath)})...`);
      try {
        execSync('npx prisma db push --skip-generate', {
          cwd: rootDir,
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
        console.log('[DB Sync] Tablas de SQLite creadas o actualizadas.');

        if (!dbExists && fs.existsSync(path.join(__dirname, 'seed.js'))) {
          console.log('[DB Sync] Inicializando datos por defecto (seed)...');
          try {
            execSync('node prisma/seed.js', {
              cwd: rootDir,
              stdio: 'inherit',
              env: { ...process.env, DATABASE_URL: dbUrl },
            });
            console.log('[DB Sync] Datos iniciales cargados.');
          } catch (seedErr) {
            console.warn('[DB Sync] Advertencia en seed:', seedErr.message);
          }
        }
      } catch (pushErr) {
        console.error('[DB Sync] Error creando tablas en SQLite:', pushErr.message);
      }
    }
  }

  console.log(`[DB Sync] Base de datos lista usando motor: ${provider.toUpperCase()}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  syncSchema();
}
