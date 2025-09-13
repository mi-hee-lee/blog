// components/GNB.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

export default function GNB() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isDetail = useMemo(() => (router.pathname || '').startsWith('/posts/'), [router.pathname]);

  return (
    <>
      <header className="gnb">
        <div className="inner">
          {/* 상세 페이지 → Back + Home */}
          {isDetail ? (
            <>
              <button className="iconbtn" aria-label="Back" onClick={() => router.back()}>
                <img src="/assets/ic-back.svg" alt="Back" />
              </button>
              <Link href="/" className="iconbtn" aria-label="Home">
                <img src="/assets/ic-home.svg" alt="Home" />
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="brand">Designer Mihee</Link>
              <nav className="nav desktop">
                <a href="/#career" className="link">Career</a>
                <a href="/#archive" className="link">Project Archive</a>
              </nav>
              <button className="hamburger" onClick={() => setOpen(v => !v)} aria-label="menu">☰</button>
            </>
          )}
        </div>

        {!isDetail && open && (
          <nav className="nav mobile">
            <a href="/#career" className="link" onClick={() => setOpen(false)}>Career</a>
            <a href="/#archive" className="link" onClick={() => setOpen(false)}>Project Archive</a>
          </nav>
        )}
      </header>

      <div style={{ height: 64 }} />

      <style jsx>{`
        .gnb {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          width: 100%;
          background: rgba(30,30,30,0.6);
          backdrop-filter: blur(6px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .inner {
          height: 64px;
          max-width: 960px;
          margin: 0 auto;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .brand {
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: .02em;
        }
        .nav { display: flex; gap: 16px; align-items: center; }
        .link {
          color: #e5e7eb;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 10px;
          border-radius: 10px;
          transition: background .15s ease, color .15s ease;
        }
        .link:hover { background: rgba(255,255,255,.06); color:#fff; }
        .hamburger {
          display: none;
          background: transparent;
          color: #fff;
          border: 0;
          font-size: 22px;
          padding: 8px;
          border-radius: 8px;
        }
        .mobile {
          display: none;
          flex-direction: column;
          gap: 8px;
          padding: 8px 16px 16px;
          background: rgba(30,30,30,.6);
          backdrop-filter: blur(6px);
        }
        .iconbtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .iconbtn img {
          width: 20px !important;
          height: 20px !important;
          max-width: 24px;
          display: block;
          object-fit: contain;
        }
        @media (max-width: 600px) {
          .desktop { display: none; }
          .hamburger { display: block; }
          .mobile { display: flex; }
        }
      `}</style>
    </>
  );
}