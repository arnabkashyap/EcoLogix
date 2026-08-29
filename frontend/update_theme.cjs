const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Hp/Desktop/programs/antigravity/eco2/frontend/src';

const replacements = [
  { regex: /#121214/gi, replacement: '#181A20' },
  { regex: /#1A1A1E/gi, replacement: '#111827' },
  { regex: /#2E2E34/gi, replacement: '#1F2937' },
  { regex: /#EDEDF0/gi, replacement: '#F3F4F6' },
  { regex: /#8A8A93/gi, replacement: '#9CA3AF' },
  { regex: /#22C55E/gi, replacement: '#10B981' },
  { regex: /rgba\(15,\s*23,\s*42/g, replacement: 'rgba(17, 24, 39' },
  { regex: /bg-slate-800/g, replacement: 'bg-[#1F2937]' },
  { regex: /bg-slate-900/g, replacement: 'bg-[#111827]' },
  { regex: /bg-slate-950/g, replacement: 'bg-[#181A20]' },
  { regex: /#030712/gi, replacement: '#181A20' },
  { regex: /#0b1329/gi, replacement: '#181A20' },
  { regex: /#090d16/gi, replacement: '#181A20' }
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);
files.forEach(file => {
  if (file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.js')) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const { regex, replacement } of replacements) {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
});
