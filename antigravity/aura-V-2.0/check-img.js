import fs from 'fs';

async function checkImage() {
  try {
    // using dynamic import for jimp or just analyzing signature
    const url = 'https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const arr = new Uint8Array(buffer);
    
    // Check PNG signature
    const isPng = arr[0] === 137 && arr[1] === 80 && arr[2] === 78 && arr[3] === 71;
    console.log("Is PNG:", isPng);
    
    // Very naive check for transparency: we'd need an image parser
    console.log("Size:", arr.length);
  } catch(e) {
    console.error(e);
  }
}
checkImage();
