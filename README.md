# koa-node-fetch-issue


###  installation

```
npm install
```

### Steps to reproduce the issue

Start the server 
```
node index.js
```

Fetch the recording and abort it half way through

```
curl localhost:8080 --output  test.mov
```

Check mem stats

```
cat /proc/net/sockstat
```

Repeat the process of recording fetching and aborting

As a result you will see TCP mem stat going up.

Example:
```
cat /proc/net/sockstat

sockets: used 354
TCP: inuse 31 orphan 0 tw 8 alloc 36 mem 1473
UDP: inuse 14 mem 5
UDPLITE: inuse 0
RAW: inuse 0
FRAG: inuse 0 memory 0
```

#### Mitigation

I managed to resolve the issue by adding AbortController, which would close the stream from video source to nodejs server. Howver, I'm not sure why it is working and whether it is done in a right way

```diff
+ const abortController = new AbortController();
  const response = await nodeFetch(url, {
+   signal: abortController.signal,
    headers: {
      range: ctx.headers.range,
    },
    timeout: 5000,
  });
  ...
    .on('close', () => {
      console.log(`Received bytes: ${bytesSent} / ${totalBytes}`);
      console.log('Recording stream is closed');
+     abortController.abort();
    });

```

See `mitigation.js`

### Why koa issue?

When streaming with nodejs http server there is no issue of TCP memory leak.

Try reproducing similar steps with `nokoa.js` as a server

See https://github.com/koajs/koa/issues/1834
