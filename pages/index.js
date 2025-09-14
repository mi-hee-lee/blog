// pages/index.js
import { Bricolage_Grotesque } from "next/font/google";
import HereTitle from '../components/HereTitle';
import SectionHeader from '../components/SectionHeader';
import CareerAccordion from '../components/CareerAccordion';
import ArchiveList from '../components/ArchiveList';
import { getPostsGrouped, getDownloadItems } from '../lib/notion';
import DownloadBlock from '../components/DownloadBlock';

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-bricolage",
});

export async function getStaticProps() {
  const revalidate = Number(process.env.REVALIDATE_SECONDS || 60);
  try {
    const [sections, downloads] = await Promise.all([
      getPostsGrouped(),
      getDownloadItems(),
    ]);
    return { props: { sections, downloads }, revalidate };
  } catch (_) {
    return { props: { sections: [], downloads: null }, revalidate };
  }
}

export default function Home({ sections, downloads = null }) {
  const groups = Array.isArray(sections) ? sections : [];

  // 숨길 섹션: .env의 NEXT_PUBLIC_HIDE_SECTIONS=career,archive 처럼 콤마로 관리
  const HIDE_SECTIONS = (process.env.NEXT_PUBLIC_HIDE_SECTIONS || 'career')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // 날짜 예쁘게
  const formatDate = (isoOrStr) => {
    if (!isoOrStr) return '';
    const d = new Date(isoOrStr);
    return isNaN(d)
      ? isoOrStr
      : new Intl.DateTimeFormat('ko', { year: 'numeric', month: '2-digit', day: '2-digit' })
          .format(d)
          .replace(/\./g, '.')
          .replace(/\s/g, '');
  };

  // 섹션 라벨(표시용)과 앵커 id 매핑
  const labelMap = { career: 'Career', archive: 'Project Archive' };
  const idMap = { career: 'career', archive: 'archive' };

  return (
    <main className={bricolage.variable} style={{ maxWidth: 960, margin: '0 auto', padding: 0 }}>
      {/* 상단 히어로 타이틀 */}
      <HereTitle />

      {/* 다운로드 블록 (있으면만 노출) */}
      {downloads?.portfolio && (
        <DownloadBlock
          title={downloads.portfolio.title}
          date={formatDate(downloads.portfolio.lastUpdate)}
          href="/api/download/portfolio"
        />
      )}
      {downloads?.resume && (
        <DownloadBlock
          title={downloads.resume.title}
          date={formatDate(downloads.resume.lastUpdate)}
          href="/api/download/resume"
        />
      )}

      {/* 섹션들 */}
      {groups.length === 0 ? (
        <div style={{ color: '#999', marginTop: 24 }}>
          섹션 데이터를 불러오지 못했어요. 환경변수 또는 DB 연결을 확인해주세요.
        </div>
      ) : (
        groups
          .filter(({ section }) => !HIDE_SECTIONS.includes(section)) // 숨길 섹션 제외
          .map(({ section, posts }) => (
            <section
              key={section}
              id={idMap[section] || section}
              style={{ marginTop: 80 }}
            >
              {<SectionHeader section={section} label={labelMap[section] || section} />}
              {section === 'career' ? (
                <CareerAccordion posts={posts} />
              ) : (
                <ArchiveList posts={posts} />
              )}
            </section>
          ))
      )}
    </main>
  );
}