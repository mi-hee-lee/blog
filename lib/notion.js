// lib/notion.js
import { Client } from '@notionhq/client';
import { buildProxiedImageUrl } from './notionImage';

/* ----------------------------- utils ----------------------------- */
function normalizeSlug(s = '') {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getEnv() {
  if (typeof window !== 'undefined') return { key: null, dbs: [] };

  const key = process.env.NOTION_KEY;
  if (!key) throw new Error('ENV missing: NOTION_KEY');

  // 권장: NOTION_DATABASES = career:xxx,archive:yyy
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

  // 구버전: NOTION_DATABASE_ID = id1,id2
  if (!dbs.length) {
    const ids = (process.env.NOTION_DATABASE_ID || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    dbs = ids.map((id, i) => ({ name: `db${i + 1}`, id }));
  }

  if (!dbs.length) throw new Error('No Notion DB configured');
  return { key, dbs };
}

function createClient(key) {
  return new Client({ auth: key });
}

/* --------------------------- low-level --------------------------- */
async function queryAllPages(notion, database_id) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases
      .query({ database_id, start_cursor: cursor, page_size: 100 })
      .catch(err => {
        console.error('[Notion] query failed for DB:', database_id, err.code, err.message);
        return { results: [], has_more: false };
      });
    pages.push(...(res.results || []));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

/* -------------------------- prop helpers ------------------------- */
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

function makePlainMap(properties = {}) {
  const out = {};
  for (const [k, v] of Object.entries(properties)) out[k] = propToPlain(v);
  return out;
}

/** 파일/URL 속성에서 첫 이미지 URL을 찾아 폴백 */
function firstFileFromProps(props = {}) {
  for (const v of Object.values(props)) {
    if (v?.type === 'files' && Array.isArray(v.files) && v.files.length) {
      const f = v.files[0];
      const url = f?.file?.url || f?.external?.url;
      if (url) return url;
    }
    if (v?.type === 'url' && v.url) {
      // URL 속성에 이미지 링크를 직접 넣은 경우
      return v.url;
    }
  }
  return null;
}

/* ----------------------- date formatting ----------------------- */
function formatKDate(iso) {
  if (!iso) return '';
  // SSR/CSR 동일 결과 보장을 위해 timezone 고정
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(iso));
}

/* ----------------------- page -> app meta ------------------------ */
function extractMetaFlexible(page) {
  const props = page.properties || {};

  // title
  const titlePropName = Object.keys(props).find(k => props[k]?.type === 'title');
  const title = props[titlePropName]?.title?.[0]?.plain_text || 'Untitled';

  // slug (명시 속성 > 아무 rich_text > 타이틀 > 페이지ID)
  const slugCandidates = ['Slug', 'slug', '슬러그', 'URL', 'Url', 'url'];
  const rawSlug =
    slugCandidates.map(n => props[n]?.[props[n]?.type]?.[0]?.plain_text).find(Boolean) ||
    Object.values(props).filter(p => p?.type === 'rich_text')
      .map(p => p.rich_text?.[0]?.plain_text).find(Boolean) ||
    title ||
    page.id;
  const slug = normalizeSlug(rawSlug);

  // ✅ cover: page.cover → 파일/URL 속성 → null
  const coverRaw =
    page.cover?.external?.url ||
    page.cover?.file?.url ||
    firstFileFromProps(props) ||
    null;

  const cover = coverRaw
    ? buildProxiedImageUrl(coverRaw, page.id).finalUrl || coverRaw
    : null;

  // date (정렬용 원시 값)
  const dateCandidates = ['Date', 'date', '날짜', 'Published At', 'PublishedAt'];
  let date =
    dateCandidates.map(n => props[n]?.date?.start).find(Boolean) ||
    Object.values(props).find(p => p?.type === 'date')?.date?.start ||
    page.created_time;

  // tags
  const tagsProp = Object.values(props).find(p => p?.type === 'multi_select');
  const tags = (tagsProp?.multi_select || []).map(t => t.name);

  // published
  const pubCandidates = ['Published', 'published', '게시', '공개', '발행'];
  let published = pubCandidates.map(n => props[n]?.checkbox)
    .find(v => typeof v === 'boolean');
  if (typeof published !== 'boolean') {
    const firstCheckbox = Object.values(props).find(p => p?.type === 'checkbox');
    published = typeof firstCheckbox?.checkbox === 'boolean'
      ? firstCheckbox.checkbox : true;
  }

  // order (Project Archive 정렬용)
  const order = props.Order?.number ?? null;

  const plain = makePlainMap(props);

  // formatted date for consistent SSR/CSR
  const formattedDate = formatKDate(date);

  return { id: page.id, title, slug, cover, date, formattedDate, tags, published, order, plain };
}

/* ---------------------------- public API ---------------------------- */
export async function getPostsGrouped() {
  const { key, dbs } = getEnv();
  const notion = createClient(key);

  const grouped = [];
  for (const { name, id } of dbs) {
    const pages = await queryAllPages(notion, id);
    let posts = pages.map(extractMetaFlexible).filter(p => {
      // archive 섹션은 Order가 있는 것만, 다른 섹션은 published만 체크
      const shouldInclude = name === 'archive' ? p.order != null : p.published;
      console.log('Post:', p.title, 'section:', name, 'published:', p.published, 'order:', p.order, 'include:', shouldInclude);
      return shouldInclude;
    });

    // slug 중복 제거
    const seen = new Set();
    posts = posts.filter(p => {
      if (!p.slug) {
        console.log('Missing slug for post:', p.title, 'order:', p.order);
        return false;
      }
      const s = normalizeSlug(p.slug);
      if (seen.has(s)) {
        console.log('Duplicate slug detected:', s, 'for post:', p.title, 'order:', p.order);
        return false;
      }
      seen.add(s);
      return true;
    });

    // 섹션별 정렬
    if (name === 'archive') {
      // Project Archive → Order 오름차순(작은 숫자 먼저), 없으면 date 최신순
      posts.sort((a, b) => {
        const ao = a.order, bo = b.order;
        if (ao != null && bo != null) return ao - bo;
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
  return Array.from(
    new Set(
      all
        .map(p => normalizeSlug(p.slug))
        .filter(Boolean)
    )
  );
}

/* ----------------------- blocks (with children) ----------------------- */
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

/* ------------------------- download items DB ------------------------- */
export async function getDownloadItems() {
  const key = process.env.NOTION_KEY;
  const dbId = process.env.NOTION_DOWNLOAD_DB;
  if (!key || !dbId) return { portfolio: null, resume: null, portfolioGnb: null, resumeGnb: null };

  const notion = new Client({ auth: key });
  const pages = await queryAllPages(notion, dbId);

  // DownloadBlock용 (Published만 체크, GNB는 체크 안함)
  const pickForDownload = (type) => {
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
      const gnb =
        typeof props.GNB?.checkbox === 'boolean'
          ? props.GNB.checkbox
          : false;
      return pub && !gnb && (t || '').toLowerCase() === type;
    });
    arr.sort((a, b) => (b.last_edited_time || '').localeCompare(a.last_edited_time || ''));
    const p = arr[0];
    if (!p) return null;
    const file =
      p.properties?.File?.files?.[0]?.file?.url ||
      p.properties?.File?.files?.[0]?.external?.url ||
      '';
    // 페이지 기본 타이틀 찾기
    const titlePropName = Object.keys(p.properties || {}).find(k => p.properties[k]?.type === 'title');
    const title =
      p.properties?.[titlePropName]?.title?.[0]?.plain_text ||
      (type === 'portfolio' ? 'Latest Portfolio (PDF)' : 'Resume (PDF)');
    const lastUpdate =
      p.properties?.['Last Update']?.date?.start || p.last_edited_time;
    return { title, file, lastUpdate };
  };

  // GNB용 (Published + GNB 둘 다 체크)
  const pickForGnb = (type) => {
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
      const gnb =
        typeof props.GNB?.checkbox === 'boolean'
          ? props.GNB.checkbox
          : false;
      return pub && gnb && (t || '').toLowerCase() === type;
    });
    arr.sort((a, b) => (b.last_edited_time || '').localeCompare(a.last_edited_time || ''));
    const p = arr[0];
    if (!p) return null;
    const file =
      p.properties?.File?.files?.[0]?.file?.url ||
      p.properties?.File?.files?.[0]?.external?.url ||
      '';
    // 페이지 기본 타이틀 찾기
    const titlePropName = Object.keys(p.properties || {}).find(k => p.properties[k]?.type === 'title');
    const title =
      p.properties?.[titlePropName]?.title?.[0]?.plain_text ||
      (type === 'portfolio' ? 'Latest Portfolio (PDF)' : 'Resume (PDF)');
    const lastUpdate =
      p.properties?.['Last Update']?.date?.start || p.last_edited_time;
    return { title, file, lastUpdate };
  };

  return {
    // DownloadBlock용 (Published만 체크)
    portfolio: pickForDownload('portfolio'),
    resume: pickForDownload('resume'),
    // GNB용 (Published + GNB 둘 다 체크)
    portfolioGnb: pickForGnb('portfolio'),
    resumeGnb: pickForGnb('resume'),
  };
}
