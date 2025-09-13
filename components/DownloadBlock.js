// components/DownloadBlock.js
export default function DownloadBlock({
  title = 'Latest Portfolio (PDF)',
  date = '25.07.31',
  href = '#',
  accent = '#90A3FF',
}) {
  return (
    <>
      <a href={href} target="_blank" rel="noopener noreferrer" className="dl">
        <div className="left">
          <p className="title">{title}</p>
          <p className="date">Last File Update: {date}</p>
        </div>
        <div className="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            width="24"
            height="24"
            fill={accent}
          >
            <path d="M4 0V2H16.59L0 18.59L1.41 20L18 3.41V16H20V0H4Z" />
          </svg>
        </div>
      </a>

      <style jsx>{`
        .dl {
          -webkit-text-size-adjust: 100%;
          -webkit-tap-highlight-color: transparent;
          -webkit-font-smoothing: antialiased;
          font-synthesis: none;

          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
          position: relative;

          width: 100%;
          padding: 32px 40px 28px;
          box-sizing: border-box;

          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;

          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease,
            border-color 0.2s ease;
        }
        .dl:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .left {
          flex: 1;
          display: grid;
          gap: 4px;
        }
        .title {
          font-family: var(
            --default-font-family,
            ui-sans-serif,
            system-ui,
            sans-serif,
            "Apple Color Emoji",
            "Segoe UI Emoji",
            "Segoe UI Symbol",
            "Noto Color Emoji"
          );
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }
        .date {
          font-size: 14px;
          color: #aaa;
          margin: 0;
        }

        .icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 600px) {
          .dl {
            padding: 24px 20px;
          }
          .title {
            font-size: 16px;
          }
          .date {
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}