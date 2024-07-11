const http = require('http');
const Koa = require('koa');
const nodeFetch = require('node-fetch');

const httpPort = 8080;
const app = new Koa();

process.on('exit', () => {
  console.log('Shutting down container...');
});

process.on('SIGINT', () => {
  console.error('Received signal: SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  console.error('Received signal: SIGTERM');
  process.exit();
});

process.on('uncaughtException', (err, origin) => {
  console.error(origin, err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled rejection at:', promise, 'reason:', reason);
});

const url = 'https://parentingmontana.org/wp-content/uploads/2023/02/30-Second-Video-12.mov';
app.use(async (ctx, next) => {
  const abortController = new AbortController();
  const response = await nodeFetch(url, {
    signal: abortController.signal,
    headers: {
      range: ctx.headers.range,
    },
    timeout: 5000,
  });

  console.log(response.status, response.statusText);
  const totalBytes = Number(response.headers.get('content-length')) || 0;
  let bytesSent = 0;

  ctx.set({
    'cache-control': 'no-cache, no-store',
    'accept-ranges': 'bytes',
    'content-disposition': `inline`,
    'content-range': response.headers.get('content-range'),
    'content-length': response.headers.get('content-length'),
    'content-type': response.headers.get('content-type'),
  });

  let last10Mb = 0;
  const stream = response.body
    .on('data', (data) => {
      bytesSent += data.length;
      if (bytesSent / 1024 / 1024 / 10 > last10Mb) {
        last10Mb = Math.ceil(bytesSent / 1024 / 1024 / 10);

        console.log(`Received bytes: ${bytesSent} / ${totalBytes}`);
      }
    })
    .on('error', (err) => {
      console.log('Error encountered during streaming', err);
    })
    .on('end', () => {
      console.log('All S3 data has been transferred');
    })
    .on('close', () => {
      console.log(`Received bytes: ${bytesSent} / ${totalBytes}`);
      console.log('Recording stream is closed');
      abortController.abort();
    });

  ctx.status = response.status;
  ctx.body = stream;
  await next();
});

http.createServer(app.callback()).listen(httpPort);

console.log(`Server running on http port ${httpPort}`);
