// components/ArchiveList.js
import Link from 'next/link';

// Archive 리스트에서 {} 브라켓 제거 함수
function removeBraces(text) {
  if (!text) return '';
  return text.replace(/\{([^}]*)\}/g, '$1');
}

export default function ArchiveList({ posts = [] }) {
  if (!posts.length) return <div style={{ color: '#999' }}>아직 글이 없어요.</div>;

  return (
    <ul className="archive-list">
      {posts.map((p) => (
        <li key={p.slug} className="archive-item">
          <Link href={`/posts/${p.slug}`} className="card">
            <h3 className="title">{removeBraces(p.title)}</h3>

            {/* Working Duration 속성값 사용 */}
            {p.plain?.["Working Duration"] && (
              <span className="duration">{p.plain["Working Duration"]}</span>
            )}


            {p.tags?.length ? (
              <div className="tags">
                {p.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            ) : null}
          </Link>
        </li>
      ))}
 
      <style jsx>{`
        .archive-list {
          display: flex;
          flex-direction: column;
          gap: 40px;
          padding: 0;
          list-style: none;
        }
        .archive-item {
          margin: 0;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .card {
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .archive-list a,
        .archive-list a:hover,
        .archive-list a:active,
        .archive-list a:focus,
        .archive-list a:visited {
          text-decoration: none !important;
        }
        .archive-list a *,
        .archive-list a:hover *,
        .archive-list a:active *,
        .archive-list a:focus *,
        .archive-list a:visited * {
          text-decoration: none !important;
        }
        .archive-item:hover {
          transform: translateY(-2px);
        }
        .archive-item:active {
          transform: translateY(0);
          opacity: 0.8;
        }

        .title {
          font-size: 16px;
          line-height: 1.2;
          font-weight: 500;
          color: #fff;
          margin: 16px 0 16px;
          transition: color 0.2s ease;
        }
        .archive-item:hover .title {
          color: #90a3ff;
        }
        .duration {
          display: block;
          font-size: 14px;
          color: #9ca3af;
          margin: 16px 0 12px;
        }
        .tags {
          margin: 0 0px 8px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #ffffff10;
          color: #ffffff;
        }

        @media (max-width: 600px) {
          .archive-list {
            padding: 0 16px;
          }
        }
      `}</style>
    </ul>
  );
}