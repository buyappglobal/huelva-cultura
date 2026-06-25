const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('helmet') || line.includes('Content-Security-Policy')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
