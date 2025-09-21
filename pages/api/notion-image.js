import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  const { src } = req.query;
  if (!src || typeof src !== 'string') {
    res.status(400).send('missing src');
    return;
  }

  const method = req.method?.toUpperCase() === 'HEAD' ? 'HEAD' : 'GET';
  const forwardHeaders = {};
  if (req.headers.range) {
    forwardHeaders.range = req.headers.range;
  }
  if (req.headers['if-range']) {
    forwardHeaders['if-range'] = req.headers['if-range'];
  }

  try {
    const upstream = await fetch(src, {
      method,
      headers: forwardHeaders,
      redirect: 'follow'
    });

    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).send('upstream error');
      return;
    }

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    }

    res.status(upstream.status || 200);

    if (method === 'HEAD') {
      res.end();
      return;
    }

    const body = upstream.body;
    if (!body) {
      res.end();
      return;
    }

    const nodeStream = toNodeStream(body);
    nodeStream.on('error', (err) => {
      console.error('[notion-image] stream error:', err);
      res.destroy(err);
    });
    nodeStream.pipe(res);
  } catch (err) {
    console.error('[notion-image] proxy failed:', err);
    if (!res.headersSent) {
      res.status(500).send('proxy error');
    } else {
      res.end();
    }
  }
}

function toNodeStream(body) {
  if (!body) return null;
  if (typeof Readable.fromWeb === 'function') {
    return Readable.fromWeb(body);
  }

  const reader = body.getReader();
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (err) {
        this.destroy(err);
      }
    }
  });
}
