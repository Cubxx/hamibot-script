import 'dotenv/config';

const { token, script_id } = process.env;

const hostname = 'hamibot.com';
const host = `https://${hostname}`;
const path = `/dashboard/scripts/edit/${script_id}`;
const html = await fetch(host + path, { method: 'GET' }).then((e) => e.text());
const website_id = html.match(
  /src="https:\/\/echo.hamibot.com\/.+?data-website-id="(.+?)"/,
)?.[1];
if (!website_id) throw new Error('Failed to get website id');
const _token = await fetch(`https://echo.${hostname}/api/collect`, {
  method: 'POST',
  headers: {
    referer: host,
    'sec-ch-ua':
      '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': 'Windows',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  },
  body: JSON.stringify({
    type: 'pageview',
    payload: {
      website: website_id,
      hostname: hostname,
      screen: '1920x1080',
      language: 'zh-CN',
      url: path,
      referrer: path,
    },
  }),
}).then((e) => e.text());

import WebSocket from 'ws';
function ping() {
  setTimeout(() => ws.ping(), 1e4);
}
function send(type, payload) {
  console.log('send', type, payload);
  ws.send(JSON.stringify([type, payload]));
}
function push(code, file) {
  send('b:script:push', {
    _id: script_id,
    type: 'file',
    file: Object.assign(file, { text: code, size: code.length }),
  });
}
const ws = new WebSocket(
  'wss://hamibot.cn/socket.io/?' +
    new URLSearchParams({
      token,
      version: '' + 3,
      EIO: '' + 3,
      transport: 'websocket',
    }),
)
  .on('close', (code, reason) => {
    console.error('close', code, reason.toString());
    process.exit(1);
  })
  .on('error', console.error)
  .on('pong', ping)
  .on('message', (raw) => {
    const rawString = raw.toString();
    console.log('recv', rawString);
    if (rawString === '40') {
      ping();
      send('b:join', { joinId: Date.now() });
      return;
    }
    const rawData = rawString.match(/^\d+(.*)$/)?.[1];
    if (!rawData) return;
    const data = JSON.parse(rawData);
    if (!data || !Array.isArray(data)) return;
    const [type, payload] = data;
    if (type === 'join:success') send('b:script:pull', { _id: script_id });
    if (type === 'b:script:pull:success')
      push('// Your code here', payload.files[0]);
  });
