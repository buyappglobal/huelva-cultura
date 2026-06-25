import http from 'http';

const url = 'http://localhost:3000/api/session/1234?forceFolder=active&skip=true&skipCount=0';

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});
