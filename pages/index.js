// pages/index.js
import { Bricolage_Grotesque } from "next/font/google";
import HereTitle from '../components/HereTitle';
import SectionHeader from '../components/SectionHeader';
import CareerAccordion from '../components/CareerAccordion';
import ArchiveList from '../components/ArchiveList';
import { getPostsGrouped, getDownloadItems } from '../lib/notion';
import DownloadBlock from '../components/DownloadBlock';

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"], // 꼭 적어야 함
  weight: ["400", "500", "700"], // 쓰고 싶은 굵기
  variable: "--font-bricolage", // CSS 변수로 쓸 이름
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

  // 날짜 예쁘게
  const formatDate = (isoOrStr) => {
    if (!isoOrStr) return '';
    const d = new Date(isoOrStr);
    return isNaN(d)
      ? isoOrStr
      : new Intl.DateTimeFormat('ko', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
          .format(d)
          .replace(/\./g, '.')
          .replace(/\s/g, '');
  };

  // 섹션 라벨(표시용)과 앵커 id 매핑
  const labelMap = { career: 'Career', archive: 'Project Archive' };
  const idMap = { career: 'career', archive: 'archive' };

  return (
    <main className={bricolage.variable} style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px' }}>
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
        groups.map(({ section, posts }) => (
          <section
            key={section}
            id={idMap[section] || section}
            style={{ marginTop: 80 }}
          >
            <SectionHeader section={section} label={labelMap[section] || section} />
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