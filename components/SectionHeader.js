// components/SectionHeader.js
export default function SectionHeader({ section, label }) {
  return (
    <>
      <h2 className="section-header">{label ?? section}</h2>

      <style jsx>{`
        .section-header {
          -webkit-text-size-adjust: 100%;
          -webkit-tap-highlight-color: transparent;
          -webkit-font-smoothing: antialiased;
          font-synthesis: none;
          font-variation-settings: "opsz" 14, "wdth" 100;
          font-weight: 400;

          word-break: break-word;
          line-height: normal;
          white-space: pre-wrap;

          color: #fff;
          font-size: 12px;

          display: block;
          box-sizing: border-box;
          text-align: left;
          padding-bottom: 8px;
        }

        @media (max-width: 600px) {
          .section-header {
            font-size: 20px;
            margin:0 16px;
          }
        }
      `}</style>
    </>
  );
}