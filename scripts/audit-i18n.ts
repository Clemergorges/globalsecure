import fs from 'fs';
import path from 'path';

const messagesDir = path.join(process.cwd(), 'messages');
const baseLang = 'en.json';

if (!fs.existsSync(path.join(messagesDir, baseLang))) {
    console.error(`Base language file ${baseLang} not found.`);
    process.exit(1);
}

const baseContent = JSON.parse(fs.readFileSync(path.join(messagesDir, baseLang), 'utf-8'));
const langs = ['pt.json', 'de.json', 'fr.json'];

function getKeys(obj: any, prefix = ''): string[] {
  return Object.keys(obj).reduce((res: string[], el) => {
    if (typeof obj[el] === 'object' && obj[el] !== null) {
      return [...res, ...getKeys(obj[el], prefix + el + '.')];
    }
    return [...res, prefix + el];
  }, []);
}

const baseKeys = getKeys(baseContent);

console.log(`Base language (${baseLang}) has ${baseKeys.length} keys.`);

langs.forEach(lang => {
  const filePath = path.join(messagesDir, lang);
  if (!fs.existsSync(filePath)) {
      console.warn(`Language file ${lang} not found, skipping.`);
      return;
  }
  
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const keys = getKeys(content);
  const missing = baseKeys.filter(k => !keys.includes(k));
  
  if (missing.length > 0) {
    console.log(`❌ Missing keys in ${lang} (${missing.length}):`);
    // Limit output
    missing.slice(0, 10).forEach(k => console.log(`  - ${k}`));
    if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more.`);
  } else {
    console.log(`✅ ${lang} is complete.`);
  }
});