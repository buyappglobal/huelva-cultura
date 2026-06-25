import https from 'https';

const url = 'https://ais-dev-qsdlc7hxmt5t4fd6g2rggf-197706401959.europe-west2.run.app/api/session/1234?forceFolder=active&skip=true&skipCount=0';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});
