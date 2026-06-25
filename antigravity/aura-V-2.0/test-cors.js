import https from 'https';

https.get('https://media.auradisplay.es/active/aura_active6.mp3', {
  headers: {
    'Origin': 'http://localhost:3000'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('CORS Header:', res.headers['access-control-allow-origin']);
});
