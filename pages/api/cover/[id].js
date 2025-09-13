// pages/api/cover/[id].js
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_KEY });

function firstFileFromProps(props = {}) {
  for (const v of Object.values(props)) {
    if (v?.type === 'files' && Array.isArray(v.files) && v.files.length) {
      const f = v.files[0];
      return f?.file?.url || f?.external?.url || null;
    }
    if (v?.type === 'url' && v.url) return v.url;
  }
  return null;
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const props = page.properties || {};
    const cover =
      page.cover?.external?.url ||
      page.cover?.file?.url ||
      firstFileFromProps(props);

    if (!cover) {
      // 1x1 transparent
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(200).send('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
    }
    // 최신 URL로 302 리다이렉트
    res.setHeader('Cache-Control', 'no-cache');
    return res.redirect(302, cover);
  } catch (e) {
    console.error('cover proxy error', e);
    return res.status(500).send('Failed to fetch cover');
  }
}