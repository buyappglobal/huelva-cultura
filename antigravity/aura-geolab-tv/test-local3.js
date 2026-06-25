import http from 'http';

http.get('http://localhost:3000/api/session/1234?forceFolder=active&skip=true&skipCount=0', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(res.statusCode, body.substring(0, 50)));
});
