import fs from 'fs';

async function checkImage() {
  try {
    const url = 'https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png';
    const res = await fetch(url);
    const text = await res.text();
    console.log("Text:", text);
  } catch(e) {
    console.error(e);
  }
}
checkImage();
