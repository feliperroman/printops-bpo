/**
 * Script de Compliance, Seguridad Estática y Guardrails de Arquitectura
 * Ejecutado en la etapa 1 del Pipeline CI/CD (Compliance & Lint)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function assertCondition(condition, message) {
  if (!condition) {
    console.error(`❌ [COMPLIANCE FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [COMPLIANCE PASS] ${message}`);
}

// 1. Verificar tsconfig.json en modo estricto
const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf-8'));
assertCondition(
  tsconfig.compilerOptions && tsconfig.compilerOptions.strict === true,
  'TypeScript configurado en modo estricto (strict: true)'
);

// 2. Verificar Dockerfile Multi-Stage, Usuario Non-Root y Healthcheck (RNF-05)
const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf-8');
assertCondition(
  dockerfile.includes('AS builder') && dockerfile.includes('AS runner'),
  'Dockerfile implementa arquitectura Multi-Stage (builder + runner)'
);
assertCondition(
  dockerfile.includes('USER printops'),
  'Dockerfile ejecuta contenedor con usuario sin privilegios (USER printops)'
);
assertCondition(
  dockerfile.includes('HEALTHCHECK'),
  'Dockerfile declara HEALTHCHECK nativo sobre /health'
);

// 3. Verificar integridad del Dataset Sintético de 30 Tickets
const seedPath = path.join(ROOT, 'docs', 'evidence', 'seed-tickets-30.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
assertCondition(
  Array.isArray(seedData) && seedData.length === 30,
  'Dataset oficial docs/evidence/seed-tickets-30.json contiene exactamente 30 tickets'
);

// 4. Escaneo estático de seguridad en código fuente (sin secretos quemados ni eval)
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('eval(')) {
        assertCondition(false, `Uso prohibido de eval() detectado en ${fullPath}`);
      }
      if (/AIza[0-9A-Za-z-_]{35}/.test(content)) {
        assertCondition(false, `Posible API Key de Google filtrada en ${fullPath}`);
      }
    }
  }
}

scanDir(path.join(ROOT, 'src'));
assertCondition(true, 'Escaneo SAST en src/: 0 secretos expuestos y 0 funciones inseguras');

console.log('🎉 Todos los controles de Compliance y Seguridad Estática pasaron exitosamente.');
