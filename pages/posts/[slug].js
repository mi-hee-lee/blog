// pages/posts/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { getAllSlugs, getPostBySlug } from '../../lib/notion';
import BlockRenderer from '../../components/BlockRenderer';

/* ---------- SSG ---------- */
export async function getStaticPaths() {
  const slugs = await getAllSlugs();
  return { paths: slugs.map((slug) => ({ params: { slug } })), fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const data = await getPostBySlug(params.slug);
  if (!data) return { notFound: true };
  const revalidate = Number(process.env.REVALIDATE_SECONDS || 60);
  return { props: { ...data }, revalidate };
}

/* ---------- utils ---------- */
function isEmpty(v) {
  const s = (v ?? '').toString().trim();
  return !s || s === '비어 있음';
}
function isHexColor(s = '') {
  return /^#?[0-9A-Fa-f]{6}$/.test(String(s).trim());
}
function hexToRgba(hex, alpha = 0.6) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function Maybe({ value, children }) {
  if (isEmpty(value)) return null;
  return children(String(value).trim());
}
/** Overview 문자열에서 { … } 구간 하이라이트 */
function renderOverviewText(text, hlColor) {
  const re = /\{([^}]*)\}/g;
  const nodes = [];
  let last = 0,
    m;
  while ((m = re.exec(text)) !== null) {
    const [raw, inner] = m;
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <span key={m.index} className="hl" style={{ ['--hl']: hlColor }}>
        {inner.trim()}
      </span>
    );
    last = m.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/* ---------- page ---------- */
export default function PostPage({ meta, blocks }) {
  const p = meta?.plain || {};

  // 제외 키 (OverviewHighlight 포함)
  const HIDE_KEYS = new Set(['Desc', 'Overview', 'Overveiw', 'OverviewHighlight']);

  // 라벨 순서
  const ORDER = [
    'Working Duration',
    'Client',
    'Design Contribution',
    'Platform',
    'My Role',
    'Participate',
    'Distribution',
  ];

  const items = ORDER
    .map((key) => ({ key, label: key, value: p[key] }))
    .filter((it) => !HIDE_KEYS.has(it.key))
    .filter((it) => !isEmpty(it.value));

  // Overview & 색상 (오타 Overveiw도 지원)
  const overviewText = isEmpty(p.Overview) ? p.Overveiw : p.Overview;
  const highlightHex = p.OverviewHighlight;
  const hlRgba = isHexColor(highlightHex)
    ? hexToRgba(highlightHex, 0.6)
    : 'rgba(33,137,255,0.6)';

  const dateText = meta?.date
    ? new Date(meta.date).toLocaleDateString('ko-KR')
    : '';

  return (
    <main className="post-page">
      <Head>
        <title>{meta.title} | My Notion Blog</title>
        <meta name="description" content={meta.title} />
      </Head>

      <div className="wrap">
        <p className="back">
          <Link href="/">← 목록으로</Link>
        </p>
        <h1 className="title">{meta.title}</h1>
        {dateText && <div className="date">{dateText}</div>}

        {/* 1. Desc */}
        <Maybe value={p.Desc}>
          {(desc) => (
            <div className="desc-block">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon"
                aria-hidden="true"
              >
                <path d="m15 10 5 5-5 5"></path>
                <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
              </svg>
              <p className="desc-text">{desc}</p>
            </div>
          )}
        </Maybe>

        {/* 2. Overview */}
        <Maybe value={overviewText}>
          {(txt) => (
            <section className="overview">
              <div className="overview-title">Overview</div>
              <p className="overview-text">{renderOverviewText(txt, hlRgba)}</p>
            </section>
          )}
        </Maybe>

        {/* 3. 나머지 속성 */}
        {items.length > 0 && (
          <section className="meta-box">
            {items.map(({ key, label, value }) => (
              <div key={key} className="meta-row">
                <div className="meta-label">{label}</div>
                <div className="meta-value">{value}</div>
              </div>
            ))}
          </section>
        )}

        {/* 본문 */}
        <BlockRenderer blocks={blocks} />
      </div>

      <style jsx>{`
        .wrap {
          max-width: 960px;
          margin: 80px auto;
          padding: 0 16px;
        }
        .back {
          font-size: 14px;
          margin: 200px 0 12px;
        }
        .title {
          font-size: 96px;
          font-weight: 500;
          color: #fff;
          margin: 0 0 8px;
          line-height: 1.2;
          margin-top: 120px;
          margin-bottom: 40px;
        }
        .date {
        display:none;
        }

        /* Desc */
        .desc-block {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 24px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          margin-bottom: 32px;
        }
        .icon {
          color: #fff;
          width: 16px;
          height: 16px;
          margin-top: 4px;
          flex-shrink: 0;
        }
        .desc-text {
          font-family: Pretendard, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        /* Overview */
        .overview {
          margin: 40px 0 48px;
        }
        .overview-title {
          color: rgba(255, 255, 255, 0.6);
          font-size: 16px;
          margin-bottom: 0px;
        }
        .overview-text {
          font-family: Pretendard, sans-serif;
          font-weight: 200;
          font-size: 48px;
          line-height: 1.45;
          color: #fff;
          white-space: pre-wrap;
          margin: 12px 0 64px 0;
        }
        .overview-text :global(.hl) {
          --hl: #2189ff99;
          padding: 0 0.12em;
          border-radius: 4px;
          background-image: linear-gradient(var(--hl), var(--hl));
          background-repeat: no-repeat;
          background-size: 100% 0.62em;
          background-position: 0 90%;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }

        /* Meta rows */
        .meta-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 24px 0 40px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .meta-row:last-child {
          border-bottom: none;
        }
        .meta-label {
          min-width: 220px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 16px;
          font-family: Pretendard, sans-serif;
        }
        .meta-value {
          flex: 1;
          color: #fff;
          font-size: 16px;
          font-family: Pretendard, sans-serif;
          line-height: 1.6;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .overview-text {
            font-size: 32px;
          }
        }
      `}</style>
    </main>
  );
}