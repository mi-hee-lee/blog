// pages/api/download/[kind].js
import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  const { kind } = req.query; // 'portfolio' | 'resume'
  const key = process.env.NOTION_KEY;
  const dbId = process.env.NOTION_DOWNLOAD_DB;
  if (!key || !dbId) return res.status(500).send('Not configured');

  const notion = new Client({ auth: key });
  const pages = await notion.databases.query({ database_id: dbId, page_size: 100 });
  const page = (pages.results || []).find((p) => {
    const t =
      p.properties?.Type?.select?.name ||
      p.properties?.Type?.rich_text?.[0]?.plain_text ||
      '';
    const pub =
      typeof p.properties?.Published?.checkbox === 'boolean'
        ? p.properties.Published.checkbox
        : true;
    return pub && (t || '').toLowerCase() === kind;
  });
  if (!page) return res.status(404).send('File not found');

  const url =
    page.properties?.File?.files?.[0]?.file?.url ||
    page.properties?.File?.files?.[0]?.external?.url ||
    '';
  if (!url) return res.status(404).send('No file');

  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, { Location: url });
  res.end();
}