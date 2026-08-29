const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Hp/Desktop/programs/antigravity/eco2/frontend/src';

const replacements = {
  '#09090B': '#0B0F17',
  '#18181B': '#111827',
  '#27272A': '#1F2937',
  '#FAFAFA': '#F3F4F6',
  '#A1A1AA': '#9CA3AF'
};

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
    for (const [oldColor, newColor] of Object.entries(replacements)) {
      const regex = new RegExp(oldColor, 'gi');
      if (regex.test(content)) {
        content = content.replace(regex, newColor);
        changed = true;
      }
    }
    
    if (content.includes('24, 24, 27')) {
      content = content.replace(/24,\s*24,\s*27/g, '17, 24, 39');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
});
