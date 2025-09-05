#!/usr/bin/env tsx
/**
 * Family Hub – Audit Generator
 * Generates appstatus.md (A–AE sections) with ONLY real data or blanks.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

function run(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

function safeParseInt(str: string | null): number | null {
  if (!str) return null;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

interface Metrics {
  timestamp: string;
  buildTime?: number;
  bundleSize?: string;
  gzipSize?: string;
  linesOfCode?: number;
  routes?: number;
  components?: number;
  testPassRate?: string;
  dependencies?: number;
  projectSize?: string;
  lintErrors?: number;
  buildSuccess: boolean;
  lintSuccess: boolean;
  typeCheckSuccess: boolean;
  testSuccess: boolean;
}

function gatherMetrics(): Metrics {
  const timestamp = new Date().toISOString();

  // --- Build ---
  const buildStart = Date.now();
  let buildSuccess = true;
  let buildOutput: string | null = null;
  try {
    buildOutput = run("npm run build 2>&1");
  } catch {
    buildSuccess = false;
  }
  const buildTime = (Date.now() - buildStart) / 1000;

  // Parse bundle sizes if possible
  let bundleSize: string | undefined;
  let gzipSize: string | undefined;
  if (buildOutput) {
    const match = buildOutput.match(
      /(\d+\.\d+)\s*kB\s*│\s*gzip:\s*(\d+\.\d+)\s*kB/
    );
    if (match) {
      bundleSize = `${match[1]}kB`;
      gzipSize = `${match[2]}kB`;
    }
  }

  // --- LOC ---
  const locOut = run(
    'find src -name "*.svelte" -o -name "*.ts" -exec wc -l {} + | awk \'{s+=$1} END {print s}\''
  );
  const linesOfCode = safeParseInt(locOut);

  // --- Routes ---
  const routes = safeParseInt(
    run('find src/routes -name "+page.svelte" | wc -l')
  );

  // --- Components ---
  const components = safeParseInt(run('find src -name "*.svelte" | wc -l'));

  // --- Dependencies ---
  let dependencies: number | undefined;
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    dependencies = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }).length;
  } catch {}

  // --- Tests ---
  let testPassRate: string | undefined;
  let testSuccess = true;
  const testOut = run("npm run test:run 2>&1");
  if (testOut) {
    const m = testOut.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
    if (m) testPassRate = `${m[1]}/${m[2]}`;
  } else {
    testSuccess = false;
  }

  // --- Lint ---
  let lintSuccess = true;
  let lintErrors: number | undefined;
  const lintOut = run("npm run lint 2>&1");
  if (lintOut) {
    if (/error/.test(lintOut)) {
      lintSuccess = false;
      const matches = lintOut.match(/error/g);
      lintErrors = matches ? matches.length : undefined;
    }
  }

  // --- Type check ---
  let typeCheckSuccess = true;
  if (!run("npm run check")) typeCheckSuccess = false;

  // --- Project size ---
  const projectSize = run("du -sh . 2>/dev/null | cut -f1") || undefined;

  return {
    timestamp,
    buildTime,
    bundleSize,
    gzipSize,
    linesOfCode,
    routes,
    components,
    testPassRate,
    dependencies,
    projectSize,
    lintErrors,
    buildSuccess,
    lintSuccess,
    typeCheckSuccess,
    testSuccess,
  };
}

function generateMarkdown(m: Metrics): string {
  return `# APP STATUS – Family Hub

Version: (TODO)  
Generated: ${m.timestamp}  
Framework: (TODO)  
Backend: (TODO)  
Environment: (TODO)  

---

## 🚨 Critical Issues Summary
${m.buildSuccess ? "" : "❌ Build failed"}  
${m.lintSuccess ? "" : `❌ Lint errors found (${m.lintErrors ?? "TODO"})`}  
${m.typeCheckSuccess ? "" : "❌ TypeScript errors"}  
${m.testSuccess ? "" : "❌ Tests failed"}  

---

## (A) TITLE & VERSION
- Project: Family Hub  
- Version: (TODO)  
- Last Build: ${m.timestamp}  

**KPIs**
- Build Time: ${m.buildTime ?? "TODO"}s  
- Bundle Size: ${m.bundleSize ?? "TODO"} (${m.gzipSize ?? "TODO"} gzipped)  
- LOC: ${m.linesOfCode ?? "TODO"}  
- Routes: ${m.routes ?? "TODO"}  
- Components: ${m.components ?? "TODO"}  
- Tests: ${m.testPassRate ?? "TODO"}  
- Dependencies: ${m.dependencies ?? "TODO"}  
- Project Size: ${m.projectSize ?? "TODO"}  
- Cost: (TODO)  
- Family KPIs: (TODO)  

---

## (B) CHANGE HISTORY
(TODO)

---

## (C) PAGES & ROUTES
| Route | Purpose | Status | Notes |
|-------|---------|--------|-------|
| (TODO) | (TODO) | (TODO) | (TODO) |

---

## (D) TECH USED VS UNUSED
(TODO)

---

## (E) LAYOUT & UX
(TODO)

---

## (F) PROJECT STRUCTURE
\`\`\`
(TODO)
\`\`\`

---

## (G) NAVIGATION MAP
(TODO)

---

## (H) DATA FLOW
(TODO)

---

## (I) AUTH & SECURITY RULES
(TODO)

---

## (J) API & SCHEMAS
(TODO)

---

## (K) KNOWN ISSUES & WARNINGS
(TODO)

---

## (L) FEATURES (CURRENT & FUTURE)
(TODO)

---

## (M) TECHNICAL DEBT
(TODO)

---

## (N) UX GAPS
(TODO)

---

## (N2) LOOK & FEEL AUDIT
- Modernity: (TODO)  
- Minimalism: (TODO)  
- Beauty: (TODO)  
- Comfort: (TODO)  
- Kid Appeal: (TODO)  

---

## (O) DEPENDENCY RISK
(TODO)

---

## (P) PERFORMANCE
(TODO)

---

## (Q) TEST COVERAGE
(TODO)

---

## (R) SECURITY GAPS
(TODO)

---

## (S) UX CONSISTENCY
(TODO)

---

## (T) METRICS (THIS RUN)
- Build Time: ${m.buildTime ?? "TODO"}s  
- Bundle Size: ${m.bundleSize ?? "TODO"}  
- LOC: ${m.linesOfCode ?? "TODO"}  
- Routes: ${m.routes ?? "TODO"}  
- Components: ${m.components ?? "TODO"}  
- Tests: ${m.testPassRate ?? "TODO"}  
- Dependencies: ${m.dependencies ?? "TODO"}  
- Project Size: ${m.projectSize ?? "TODO"}  

---

## (U) METRICS TIMELINE
| Date | Build | Bundle | LOC | Tests | Notes |
|------|-------|--------|-----|-------|-------|
| ${m.timestamp.split("T")[0]} | ${m.buildTime ?? "TODO"}s | ${m.bundleSize ?? "TODO"} | ${
    m.linesOfCode ?? "TODO"
  } | ${m.testPassRate ?? "TODO"} | Baseline |

---

## (V) NEXT ACTIONS
(TODO)

---

## (W) SPRINT SUGGESTIONS
(TODO)

---

## (X) EVIDENCE INDEX
(TODO – fill with ≥20 real entries)

---

## (Y) PAGE + WIDGET MATRIX
(TODO)

---

## (Z) BANDWIDTH & COST OPTIMIZATION
(TODO)

---

## (AA) SAVINGS TRACKER
(TODO)

---

## (AB) SIMPLICITY & MAINTAINABILITY
(TODO)

---

## (AC) DOCUMENTATION & NOTES
(TODO)

---

## (AD) RESILIENCE & RECOVERY
(TODO)

---

## (AE) FAMILY FEEDBACK
(TODO)
`;
}

const metrics = gatherMetrics();
const md = generateMarkdown(metrics);
writeFileSync("appstatus.md", md);
console.log("✅ appstatus.md generated successfully");
