// components/ArchiveList.js
import Link from 'next/link';
export default function ArchiveList({ posts = [] }) {
  if (!posts.length) return <div style={{ color: '#999' }}>아직 글이 없어요.</div>;

  return (
    <ul className="archive-list">
      {posts.map((p) => (
        <li key={p.slug} className="archive-item">
          <Link href={`/posts/${p.slug}`} className="card">
            {p.cover && <img src={p.cover} alt={p.title} className="thumb" />}
            <h3 className="title">{p.title}</h3>

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
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 64px 28px;
          padding: 0;
          list-style: none;
        }
        .archive-item { margin: 0; }
        .card {
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .card:hover, .card:active, .card:focus {
          text-decoration: none;
        }
        .thumb {
          width: 100%;
          aspect-ratio: 5/3;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 12px;
          background: #222;
        }
        .title {
          font-size: 20px;
          line-height: 1.5;
          font-weight: 600;
          margin: 0 6px 8px;
          color: #fff;
        }
        .duration {
          display: block;
          font-size: 14px;
          color: #9ca3af;
          margin: 0 6px 12px;
        }
        .tags {
          margin: 0 6px 8px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .tag {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #ffffff10;
          color: #ffffff;
        }
        .archive-thumb {
          width: 100%;
          aspect-ratio: 4/3;   /* 썸네일 박스 비율 고정 */
          object-fit: cover;   /* 이미지가 꽉 차도록 */
          border-radius: 12px;
          margin-bottom: 12px;
          transition: transform 0.4s ease;
        }

        .archive-item {
          overflow: hidden;    /* 박스 넘치는 부분 잘라냄 */
          border-radius: 12px; /* 이미지 둥근 모서리 유지 */
        }

        .archive-item:hover .archive-thumb {
          transform: scale(1.1);  /* 이미지 확대 */
        }
      `}</style>
    </ul>
  );
}