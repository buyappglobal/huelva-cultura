const fs = require('fs');
const file = fs.readFileSync('server.ts', 'utf8');
const lines = file.split('\n');

function printBlock(pattern) {
  const idx = lines.findIndex(l => l.includes(pattern));
  if (idx !== -1) {
    console.log(`=== BLOCK FOR ${pattern} ===`);
    console.log(lines.slice(idx, idx + 25).join('\n'));
  } else {
    console.log(`Pattern ${pattern} not found`);
  }
}

printBlock('app.get("/api/users"');
printBlock('app.get("/api/displays"');
