const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) search(full);
    } else if (file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.html') || file === '_headers') {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('connect-src')) {
        console.log(`Found connect-src in: ${full}`);
      }
    }
  }
}
search(path.join(__dirname, '..'));
