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
const isEmpty = (v) => {
  const s = (v ?? '').toString().trim();
  return !s || s === '비어 있음';
};

const isHex6 = (s = '') => /^#?[0-9A-Fa-f]{6}$/.test(String(s).trim());
const hexToRgba = (hex, a = 0.3) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Overview 문자열에서 { … } 구간만 하이라이트 span으로 래핑 */
function renderOverview(text, hlColor) {
  const re = /\{([^}]*)\}/g;
  const nodes = [];
  let last = 0, m;
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

/** Title 문자열에서 { … } 구간만 하이라이트 span으로 래핑 */
function renderTitle(text, hlColor) {
  const re = /\{([^}]*)\}/g;
  const nodes = [];
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    const [raw, inner] = m;
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <span key={m.index} className="title-hl" style={{ ['--title-hl']: hlColor }}>
        {inner.trim()}
      </span>
    );
    last = m.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/* ---------- Page ---------- */
export default function PostPage({ meta, blocks }) {
  // meta.plain 에 노션 속성들이 평문화되어 들어있음
  const p = meta?.plain || {};

  // 오타 Overveiw 지원
  const overviewText = isEmpty(p.Overview) ? p.Overveiw : p.Overview;
  const highlightHex = p.OverviewHighlight;
  const hlRgba = isHex6(highlightHex) ? hexToRgba(highlightHex, 0.3) : 'rgba(33,137,255,0.3)';
  const hlSolid = isHex6(highlightHex) ? highlightHex : '#4A7BFF';

  // 1) Desc
  const descText = p.Desc;

  // 2) 메타 박스(제외 목록: Desc / Overview / Overveiw / OverviewHighlight / Slug / Category / Order / Name)
  const HIDE = new Set(['Desc', 'Overview', 'Overveiw', 'OverviewHighlight', 'Slug', 'Category', 'Order', 'Name']);
  // 표시 순서(필요 속성만 표시, 비어있으면 자동 생략)
  const ORDER = [
    'Working Duration', // ← 요청: 이 값 노출
    'Client',
    'Design Contribution',
    'Platform',
    'My Role',
    'Participate',
    'Distribution',
  ];

  // 속성 값 처리 함수 (Link 타입 체크 포함)
  const processPropertyValue = (key, rawValue) => {
    // meta 객체에서 원본 속성 정보 가져오기
    const rawProperty = meta?.properties?.[key];

    // URL 타입이거나 링크처럼 보이는 값 처리
    if (rawProperty?.type === 'url' ||
        (typeof rawValue === 'string' && rawValue.match(/^https?:\/\//))) {
      return {
        type: 'link',
        value: rawValue,
        display: rawValue
      };
    }

    return {
      type: 'text',
      value: rawValue,
      display: rawValue
    };
  };

  // 기존 ORDER에 있는 속성들 먼저 처리
  const orderedRows = ORDER
    .map((k) => ({ key: k, ...processPropertyValue(k, p[k]) }))
    .filter(({ key, value }) => !HIDE.has(key) && !isEmpty(value));

  // ORDER에 없는 새로운 속성들 자동 추가
  const newRows = Object.keys(p || {})
    .filter(key => !HIDE.has(key) && !ORDER.includes(key) && !isEmpty(p[key]))
    .map(key => ({ key, ...processPropertyValue(key, p[key]) }));

  // 기존 순서 + 새로운 속성들
  const metaRows = [...orderedRows, ...newRows];

  // 날짜(클라이언트에서 포맷하지 않고 서버에서 계산된 문자열 사용)
  const dateText = meta?.formattedDate || ''; // lib/notion.js에서 만들어서 넣어둔 값

  return (
    <main className="wrap">
      <Head>
        <title>{meta.title} | Portfolio</title>
        <meta name="description" content={meta.title} />
      </Head>

      <p className="back"><Link href="/">← 목록으로</Link></p>

      <h1 className="title">{renderTitle(meta.title || '', hlSolid)}</h1>
      {dateText && <div className="date">{dateText}</div>}

      {/* 1) Desc (속성명 라벨 노출 안 함) */}
      {!isEmpty(descText) && (
        <section className="desc-callout">
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="chev"
            aria-hidden
          >
            <path d="m15 10 5 5-5 5"></path>
            <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
          </svg>
          <p>{descText}</p>
        </section>
      )}

      {/* 2) Overview */}
      {!isEmpty(overviewText) && (
        <section className="overview">
          <div className="overview-title">Overview</div>
          <p className="overview-text">{renderOverview(overviewText, hlRgba)}</p>
        </section>
      )}

      {/* 3) 그 밖의 메타 속성들 */}
      {metaRows.length > 0 && (
        <section className="meta-box">
          {metaRows.map(({ key, type, value, display }) => (
            <div className="meta-row" key={key}>
              <div className="meta-label">{key}</div>
              <div className="meta-value">
                {type === 'link' ? (
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    {display}
                  </a>
                ) : (
                  display
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 본문 블록 */}
      <BlockRenderer blocks={blocks} highlightColor={isHex6(highlightHex) ? highlightHex : '#00A1F3'} />

      <style jsx>{`
        .wrap {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        .back { display: none; }
        .title { margin: 160px 0 0; font-size: 80px; font-weight: 400; line-height: 1.25; }
        .date { display:none; }

        /* Desc callout */
        .desc-callout {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 16px 20px; border-radius: 8px;
          background: rgba(255,255,255,0.04);
          margin: 20px 0 32px;
        }
        .desc-callout .chev { width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; max-width: 16px !important; max-height: 16px !important; color: #fff; opacity: .9; margin-top: 3px; flex-shrink: 0; }
        .desc-callout p { margin: 0; font-family: Pretendard, sans-serif; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.8); }

        /* Overview */
        .overview { margin: 80px 0 40px; }
        .overview-title { color: rgba(255,255,255,0.6); font-size: 16px; margin-bottom: 8px; }
        .overview-text {
          font-weight: 300;
          font-size: 40px;
          line-height: 1.6;
          color: #fff;
          white-space: pre-wrap;
          margin: 0 0 32px 0;
        }
        .overview-text :global(.hl) {
          --hl: rgba(33, 137, 255, 0.3);  /* fallback, 실제 색은 style로 주입 */
          padding: 0;
          border-radius: 4px;
          background-image: linear-gradient(var(--hl), var(--hl));
          background-repeat: no-repeat;
          background-size: 100% .62em;     /* 두께 */
          background-position: 0 90%;      /* 수직 위치 */
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }

        .title :global(.title-hl) {
          --title-hl: #4A7BFF;  /* fallback, 실제 색은 overviewhighlight 속성에서 주입 */
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          padding: 0px 32px;
          gap: 4px;
          background: var(--title-hl);
          border-radius: 500px;
          color: #000000;
          font-family: 'Bricolage Grotesque';
          font-style: normal;
          font-weight: 500;
          font-size: inherit;  /* title의 기본 폰트 크기를 상속 */
          line-height: inherit;  /* title의 기본 라인 높이를 상속 */
          flex: none;
          order: 1;
          flex-grow: 0;
        }

        /* Meta table */
        .meta-box { display: flex; flex-direction: column; gap: 12px; margin: 24px 0 40px; }
        .meta-row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .meta-row:last-child { border-bottom: none; }
        .meta-label { min-width: 200px; color: rgba(255,255,255,0.6); font-size: 14px; }
        .meta-value { flex: 1; color: #fff; font-size: 14px;  line-height: 1.6; word-break: break-word; }

        @media (max-width: 600px) {
          .title { font-size: 64px; }
          .overview-text { font-size: 32px; }
          .meta-label { min-width: 140px; }
          .desc-callout .chev { width: 16px; height: 16px; }
        }
      `}</style>
    </main>
  );
}