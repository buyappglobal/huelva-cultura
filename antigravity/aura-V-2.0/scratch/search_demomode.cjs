const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'SmartTVPlayer.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('isDemoMode')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
