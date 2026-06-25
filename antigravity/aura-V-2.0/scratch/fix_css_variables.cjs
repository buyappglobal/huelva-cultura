const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'aura', 'AuraBackgroundPlayer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of `--audio-` variables with fallback values
content = content.replace(/var\(--audio-subbass\)/g, 'var(--audio-subbass, 0)');
content = content.replace(/var\(--audio-bass\)/g, 'var(--audio-bass, 0)');
content = content.replace(/var\(--audio-mid\)/g, 'var(--audio-mid, 0)');
content = content.replace(/var\(--audio-treble\)/g, 'var(--audio-treble, 0)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('CSS custom properties fallbacks successfully added to AuraBackgroundPlayer.tsx');
