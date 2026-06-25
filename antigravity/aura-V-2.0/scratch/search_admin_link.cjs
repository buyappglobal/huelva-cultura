const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'SuperAdmin.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('window.open') || line.includes('target="_blank"') || line.includes('/admin?')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
