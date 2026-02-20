const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'messages');
const locales = ['pt', 'en', 'fr', 'de'];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, next));
    } else {
      out[next] = v;
    }
  }
  return out;
}

const baseLocale = 'pt';
const basePath = path.join(messagesDir, `${baseLocale}.json`);
const base = flatten(readJson(basePath));

let hasMissing = false;

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`[i18n] missing file: ${locale}.json`);
    hasMissing = true;
    continue;
  }

  const current = flatten(readJson(filePath));
  const missing = Object.keys(base).filter((k) => !(k in current));
  if (missing.length) {
    hasMissing = true;
    console.error(`[i18n] ${locale}: missing ${missing.length} keys`);
    for (const k of missing.slice(0, 200)) {
      console.error(`- ${k}`);
    }
    if (missing.length > 200) {
      console.error(`... and ${missing.length - 200} more`);
    }
  } else {
    console.log(`[i18n] ${locale}: OK`);
  }
}

process.exitCode = hasMissing ? 1 : 0;

