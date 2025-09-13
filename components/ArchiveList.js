// components/ArchiveList.js
import Link from 'next/link';

export default function ArchiveList({ posts=[] }) {
  if (!posts?.length) return <div style={{ color: '#999' }}>아직 글이 없어요.</div>;

  
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {posts.map((p) => (
        <li
          key={p.slug}
          style={{
            padding: '32px 0',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'baseline'
          }}
  >
          <Link
            href={`/posts/${p.slug}`}
            style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', textDecoration: 'none' }}
          >
            {p.title}
          </Link>
          <time style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(p.date)}</time>
          {p.tags?.length ? (
            <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {p.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    padding: '2px 12px',
                    borderRadius: 999,
                    background: '#ffffff10',
                    color: '#ffffff'
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ko', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

