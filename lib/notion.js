// lib/notion.js
import { Client } from '@notionhq/client';

function normalizeSlug(s = '') {
  return String(s)
    .trim()                      // 앞뒤 공백 제거
    .toLowerCase()               // 소문자
    .replace(/[\s_]+/g, '-')     // 공백/언더바 -> 하이픈
    .replace(/[^a-z0-9-]/g, '')  // URL-safe 문자만 남기기
    .replace(/-+/g, '-')         // 하이픈 연속 → 하나
    .replace(/^-|-$/g, '');      // 양끝 하이픈 제거
}

function getEnv() {
  if (typeof window !== 'undefined') return { key: null, dbs: [] };

  const key = process.env.NOTION_KEY;
  if (!key) throw new Error('ENV missing: NOTION_KEY');

  // 라벨:ID 형식(권장)
  const raw = process.env.NOTION_DATABASES || '';
  let dbs = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const [name, id] = pair.split(':').map(s => s.trim());
      if (!name || !id) return null;
      return { name, id };
    })
    .filter(Boolean);

  // 구버전(NOTION_DATABASE_ID=ID,ID...)도 허용
  if (!dbs.length) {
    const ids = (process.env.NOTION_DATABASE_ID || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    dbs = ids.map((id, i) => ({ name: `db${i + 1}`, id }));
  }

  if (!dbs.length) throw new Error('No Notion DB configured');
  return { key, dbs };
}

function createClient(key) {
  return new Client({ auth: key });
}

// ---------- helpers ----------
async function queryAllPages(notion, database_id) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id, start_cursor: cursor, page_size: 100
    }).catch(err => {
      console.error('[Notion] query failed for DB:', database_id, err.code, err.message);
      return { results: [], has_more: false };
    });
    pages.push(...(res.results || []));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// 속성 → 평문 문자열
function propToPlain(p) {
  if (!p || !p.type) return '';
  switch (p.type) {
    case 'title':       return (p.title || []).map(t => t.plain_text).join('');
    case 'rich_text':   return (p.rich_text || []).map(t => t.plain_text).join('');
    case 'checkbox':    return p.checkbox ? 'true' : '';
    case 'date': {
      const s = p.date?.start, e = p.date?.end;
      if (!s && !e) return '';
      const fmt = (iso) => {
        const d = new Date(iso);
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${yy}.${mm}`;
      };
      if (s && e) return `${fmt(s)} - ${fmt(e)}`;
      if (s && !e) return `${fmt(s)} ~ ing`;
      return '';
    }
    case 'multi_select': return (p.multi_select || []).map(x => x.name).join(', ');
    case 'select':       return p.select?.name || '';
    case 'number':       return (p.number ?? '').toString();
    case 'people':       return (p.people || []).map(x => x.name || x.id).join(', ');
    case 'email':        return p.email || '';
    case 'url':          return p.url || '';
    case 'files':        return (p.files?.[0]?.file?.url || p.files?.[0]?.external?.url || '') || '';
    default:             return '';
  }
}

// 모든 속성을 {키:plain} 맵으로
function makePlainMap(properties = {}) {
  const out = {};
  for (const [k, v] of Object.entries(properties)) out[k] = propToPlain(v);
  return out;
}

// 노션 페이지 → 블로그 메타 + plain
function extractMetaFlexible(page) {
  const props = page.properties || {};

  // title
  const titlePropName = Object.keys(props).find(k => props[k]?.type === 'title');
  const title = props[titlePropName]?.title?.[0]?.plain_text || 'Untitled';

  // slug (명시 속성 > 아무 rich_text > 타이틀 > 페이지ID)
    const slugCandidates = ['Slug','slug','슬러그','URL','Url','url'];
    const rawSlug =
    slugCandidates.map(n => props[n]?.[props[n]?.type]?.[0]?.plain_text).find(Boolean) ||
    Object.values(props).filter(p => p?.type === 'rich_text')
    .map(p => p.rich_text?.[0]?.plain_text).find(Boolean) ||
    title ||
    page.id;
    const slug = normalizeSlug(rawSlug);

  // date (정렬용 원시 값)
  const dateCandidates = ['Date','date','날짜','Published At','PublishedAt'];
  let date =
    dateCandidates.map(n => props[n]?.date?.start).find(Boolean) ||
    Object.values(props).find(p => p?.type === 'date')?.date?.start ||
    page.created_time;

  // tags
  const tagsProp = Object.values(props).find(p => p?.type === 'multi_select');
  const tags = (tagsProp?.multi_select || []).map(t => t.name);

  // published
  const pubCandidates = ['Published','published','게시','공개','발행'];
  let published = pubCandidates.map(n => props[n]?.checkbox)
    .find(v => typeof v === 'boolean');
  if (typeof published !== 'boolean') {
    const firstCheckbox = Object.values(props).find(p => p?.type === 'checkbox');
    published = typeof firstCheckbox?.checkbox === 'boolean'
      ? firstCheckbox.checkbox : true;
  }

  // order (Project Archive용)
  const order = props.Order?.number ?? null;

  // 평문화 맵
  const plain = makePlainMap(props);

  return { id: page.id, title, slug, date, tags, published, plain, order };
}

// ---------- public API ----------
export async function getPostsGrouped() {
  const { key, dbs } = getEnv();
  const notion = createClient(key);

  const grouped = [];
  for (const { name, id } of dbs) {
    const pages = await queryAllPages(notion, id);
    let posts = pages.map(extractMetaFlexible).filter(p => p.published);

    // slug 중복 제거
    const seen = new Set();
    posts = posts.filter(p => {
      if (!p.slug) return false;
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });

    // 섹션별 정렬
    if (name === 'archive') {
      // Project Archive → Order 우선, 없으면 date 최신순
      posts.sort((a, b) => {
        const ao = a.order, bo = b.order;
        if (ao != null && bo != null) return ao - bo; // 작은 숫자 먼저
        if (ao != null) return -1;
        if (bo != null) return 1;
        return (b.date || '').localeCompare(a.date || '');
      });
    } else {
      // Career 등 → date 최신순
      posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    grouped.push({ section: name, posts });
  }
  return grouped;
}

export async function getPostBySlug(slug) {
  const { key, dbs } = getEnv();
  const notion = createClient(key);
  const want = normalizeSlug(slug);

  for (const { id } of dbs) {
    const pages = await queryAllPages(notion, id);
    const match = pages
    .map(extractMetaFlexible)
    .find(p => p.published && normalizeSlug(p.slug) === want);
    if (match) {
      const blocks = await getBlocks(match.id, notion);
      const { id: _id, published: _pub, ...meta } = match;
      return { meta, blocks };
    }
  }
  return null;
}

export async function getAllSlugs() {
  const { key, dbs } = getEnv();
  const notion = createClient(key);
  const all = [];
  for (const { id } of dbs) {
    const pages = await queryAllPages(notion, id);
    all.push(...pages.map(extractMetaFlexible).filter(p => p.published));
  }
  return Array.from(new Set(all
    .map(p => normalizeSlug(p.slug))
    .filter(Boolean)
    ));
}

// lib/notion.js 안

export async function getBlocks(blockId, notionClient) {
  const notion = notionClient ?? new Client({ auth: process.env.NOTION_KEY });

  async function fetchTree(id) {
    const out = [];
    let cursor;
    do {
      const res = await notion.blocks.children.list({
        block_id: id,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const b of res.results) {
        // has_children이면 재귀로 자식도 채워
        if (b.has_children) {
          b.children = await fetchTree(b.id);
        } else {
          b.children = [];
        }
        out.push(b);
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
    return out;
  }

  return fetchTree(blockId);
}

// === DOWNLOAD: 노션 DB에서 Resume/Portfolio 메타 읽기 ===
export async function getDownloadItems() {
  const key = process.env.NOTION_KEY;
  const dbId = process.env.NOTION_DOWNLOAD_DB;
  if (!key || !dbId) return { portfolio: null, resume: null };

  const notion = new Client({ auth: key });
  // 모든 페이지 안전하게 조회 (100건 초과 대비)
  const pages = await queryAllPages(notion, dbId);

  const pick = (type) => {
    const arr = pages.filter((page) => {
      const props = page.properties || {};
      const t =
        props.Type?.select?.name ||
        props.Type?.rich_text?.[0]?.plain_text ||
        '';
      const pub =
        typeof props.Published?.checkbox === 'boolean'
          ? props.Published.checkbox
          : true;
      return pub && (t || '').toLowerCase() === type;
    });
    arr.sort((a, b) => (b.last_edited_time || '').localeCompare(a.last_edited_time || ''));
    const p = arr[0];
    if (!p) return null;
    const file =
      p.properties?.File?.files?.[0]?.file?.url ||
      p.properties?.File?.files?.[0]?.external?.url ||
      '';
    const title =
      p.properties?.Title?.title?.[0]?.plain_text ||
      (type === 'portfolio' ? 'Latest Portfolio (PDF)' : 'Resume (PDF)');
    const lastUpdate =
      p.properties?.['Last Update']?.date?.start || p.last_edited_time;
    return { title, file, lastUpdate };
  };

  return {
    portfolio: pick('portfolio'),
    resume: pick('resume'),
  };
}