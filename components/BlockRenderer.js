// components/BlockRenderer.js
import ResponsiveImage from './ResponsiveImage';

/* ----- 유틸: 콜아웃(또는 임의 블록) 내부의 첫 번째 이미지 URL 추출 ----- */
function firstImageUrl(block) {
  const children = block?.children || [];
  for (const b of children) {
    if (b.type === 'image') {
      const u = b.image?.file?.url || b.image?.external?.url;
      if (u) return u;
    }
  }
  return '';
}

/* ----- 기본 블록 렌더러 (단순 예시: 필요한 타입 있으면 추가해) ----- */
function renderSimpleBlock(b, i) {
  switch (b.type) {
    case 'heading_1':
      return <h1 key={i}>{b.heading_1?.rich_text?.map(t => t.plain_text).join('') || ''}</h1>;
    case 'heading_2':
      return <h2 key={i}>{b.heading_2?.rich_text?.map(t => t.plain_text).join('') || ''}</h2>;
    case 'heading_3':
      return <h3 key={i}>{b.heading_3?.rich_text?.map(t => t.plain_text).join('') || ''}</h3>;
    case 'paragraph':
      return (
        <p key={i} style={{ lineHeight: 1.7 }}>
          {b.paragraph?.rich_text?.map(t => t.plain_text).join('') || ''}
        </p>
      );
    case 'image': {
      const src = b.image?.file?.url || b.image?.external?.url;
      if (!src) return null;
      return (
        <img
          key={i}
          src={src}
          alt=""
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12, margin: '16px 0' }}
          loading="lazy"
        />
      );
    }
    case 'bulleted_list_item':
      return <li key={i}>{b.bulleted_list_item?.rich_text?.map(t => t.plain_text).join('') || ''}</li>;
    case 'numbered_list_item':
      return <li key={i}>{b.numbered_list_item?.rich_text?.map(t => t.plain_text).join('') || ''}</li>;
    case 'quote':
      return <blockquote key={i}>{b.quote?.rich_text?.map(t => t.plain_text).join('') || ''}</blockquote>;
    case 'callout': {
      // 일반 콜아웃(반응형 규칙과 무관) — 필요하면 스타일링
      const text = b.callout?.rich_text?.map(t => t.plain_text).join('') || '';
      return (
        <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 16 }}>
          {text}
        </div>
      );
    }
    default:
      return null;
  }
}

/* ----- 메인 렌더러: #Desktop / #Mobile 콜아웃 쌍 처리 포함 ----- */
export default function BlockRenderer({ blocks = [] }) {
  const out = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];

    // ❶ 반응형 이미지 콜아웃(#Desktop / #Mobile) 쌍을 우선 처리
    if (b.type === 'callout') {
      const title = (b.callout?.rich_text?.[0]?.plain_text || '').trim();
      if (title === '#Desktop' || title === '#Mobile') {
        let desktop = '';
        let mobile = '';

        if (title === '#Desktop') {
          desktop = firstImageUrl(b);
          const next = blocks[i + 1];
          const nextTitle = (next?.callout?.rich_text?.[0]?.plain_text || '').trim();
          if (next?.type === 'callout' && nextTitle === '#Mobile') {
            mobile = firstImageUrl(next);
            i += 1; // 다음 콜아웃 함께 소비
          }
        } else {
          // #Mobile 먼저 올 수도 있음
          mobile = firstImageUrl(b);
          const next = blocks[i + 1];
          const nextTitle = (next?.callout?.rich_text?.[0]?.plain_text || '').trim();
          if (next?.type === 'callout' && nextTitle === '#Desktop') {
            desktop = firstImageUrl(next);
            i += 1;
          }
        }

        out.push(
          <div key={`resp-${i}`} style={{ margin: '24px 0' }}>
            <ResponsiveImage desktop={desktop} mobile={mobile} alt="" />
          </div>
        );
        continue;
      }
    }

    // ❷ 그 외 일반 블록
    out.push(renderSimpleBlock(b, i));
  }

  return <div>{out}</div>;
}