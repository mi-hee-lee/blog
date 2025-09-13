// components/ResponsiveImage.js
export default function ResponsiveImage({ desktop, mobile, alt = '' }) {
  // 둘 다 없으면 아무것도 렌더 안 함
  if (!desktop && !mobile) return null;

  // 모바일만 있는 경우, 데스크톱만 있는 경우도 자연스럽게 처리
  return (
    <picture>
      {mobile && <source media="(max-width: 600px)" srcSet={mobile} />}
      <img
        src={desktop || mobile}
        alt={alt}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
        loading="lazy"
      />
    </picture>
  );
}