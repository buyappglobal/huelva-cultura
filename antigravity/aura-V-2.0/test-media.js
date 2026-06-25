import http from 'http';
import https from 'https';

https.get('https://media.auradisplay.es/active/aura_active6.mp3', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});
