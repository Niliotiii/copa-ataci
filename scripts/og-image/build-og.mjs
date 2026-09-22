// Gera public/og-image.png (1200×630) a partir do template editável
// scripts/og-image/og-image.html, renderizando no Chromium via Playwright.
//
// Uso:
//   npm run og:build
//
// Personalização (opcional) por variáveis de ambiente:
//   OG_TITLE="Copa Ataci"
//   OG_SUBTITLE="5ª Edição · Society 7x7 · 2026"
//   OG_FEATURES="Classificação · Jogos · Mata-Mata · Escalações"
//
// Por que HTML + Chromium (e não SVG + sharp/cairosvg)? O Chromium renderiza as
// fontes .woff2 self-hosted (Oswald/Inter) e os gradientes exatamente como o
// navegador — fidelidade total, sem depender de fontes instaladas no sistema.

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const WIDTH = 1200;
const HEIGHT = 630;

// --- Config (com defaults que espelham o banner atual) --------------------
const config = {
  title: process.env.OG_TITLE ?? "Copa Ataci",
  subtitle: process.env.OG_SUBTITLE ?? "5ª Edição · Society 7x7 · 2026",
  features:
    process.env.OG_FEATURES ??
    "Classificação · Jogos · Mata-Mata · Escalações",
};

// --- Assets embutidos como data URIs (HTML autocontido) -------------------
const paths = {
  template: resolve(__dirname, "og-image.html"),
  oswald: resolve(repoRoot, "public/fonts/oswald-3.woff2"), // subset latin (600/700)
  inter: resolve(repoRoot, "public/fonts/inter-1.woff2"), // subset latin (500)
  logo: resolve(repoRoot, "public/serra-azul.png"),
  output: resolve(repoRoot, "public/og-image.png"),
};

async function dataUri(filePath, mime) {
  const buf = await readFile(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Deixa o separador "·" dourado nos features (envolve em <span class="dot">).
function decorateFeatures(text) {
  return escapeHtml(text).replace(/\s·\s/g, '<span class="dot">·</span>');
}

async function main() {
  const [tpl, oswald, inter, logo] = await Promise.all([
    readFile(paths.template, "utf8"),
    dataUri(paths.oswald, "font/woff2"),
    dataUri(paths.inter, "font/woff2"),
    dataUri(paths.logo, "image/png"),
  ]);

  const html = tpl
    .replaceAll("__OSWALD_FONT__", oswald)
    .replaceAll("__INTER_FONT__", inter)
    .replaceAll("__LOGO__", logo)
    .replaceAll("__TITLE__", escapeHtml(config.title))
    .replaceAll("__SUBTITLE__", escapeHtml(config.subtitle))
    .replaceAll("__FEATURES__", decorateFeatures(config.features));

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    // Garante que as fontes carregaram antes de fotografar.
    await page.evaluate(() => document.fonts.ready);

    const stage = page.locator("#stage");
    const buf = await stage.screenshot({ type: "png" });
    await writeFile(paths.output, buf);

    console.log(
      `✓ og-image.png gerado (${WIDTH}×${HEIGHT}) → ${paths.output}`
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Falha ao gerar og-image:", err);
  process.exit(1);
});
