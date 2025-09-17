export default async function handler(req, res) {
  const { src } = req.query;
  if (!src || typeof src !== 'string') {
    res.status(400).send('missing src');
    return;
  }

  try {
    const upstream = await fetch(src, { redirect: 'follow' });
    if (!upstream.ok) {
      res.status(upstream.status).send('upstream error');
      return;
    }

    const arrayBuf = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/*');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[notion-image] proxy failed:', err);
    res.status(500).send('proxy error');
  }
}
