// components/FullBleedDivider.js
export default function FullBleedDivider({
  color = "rgba(255,255,255,0.08)",
  height = 1,          // 선 두께
  top = 24,            // 위 여백(px)
  bottom = 24,         // 아래 여백(px)
}) {
  return (
    <>
      <div className="full-bleed-divider" role="separator" aria-orientation="horizontal" />
      <style jsx>{`
        .full-bleed-divider {
          /* 화면 전체 폭 */
          width: 100vw;
          margin-left: calc(50% - 50vw);

          /* 여백 */
          margin-top: ${top}px;
          margin-bottom: ${bottom}px;

          /* 선 스타일 */
          border: 0;
          height: ${height}px;
          background: ${color};
        }
      `}</style>
    </>
  );
}