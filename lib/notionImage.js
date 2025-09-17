export function toProxyUrl(originalUrl) {
  if (!originalUrl) return originalUrl;
  return `/api/notion-image?src=${encodeURIComponent(originalUrl)}`;
}

export function toStableNotionImageUrl(originalUrl, blockId) {
  if (!originalUrl) return originalUrl;

  try {
    const urlObj = new URL(originalUrl);
    const host = urlObj.hostname || '';

    // 이미 Notion 프록시를 통과한 URL이면 그대로 사용
    if (host === 'www.notion.so' && urlObj.pathname.startsWith('/image/')) {
      return originalUrl;
    }

    const isNotionFileHost =
      host.endsWith('amazonaws.com') ||
      host.includes('notion-static.com');

    if (!isNotionFileHost || !blockId) return originalUrl;

    const params = new URLSearchParams();
    params.set('table', 'block');
    params.set('id', blockId);
    params.set('cache', 'v2');

    const width = urlObj.searchParams.get('width');
    const spaceId = urlObj.searchParams.get('spaceId');
    if (width) params.set('width', width);
    if (spaceId) params.set('spaceId', spaceId);

    return `https://www.notion.so/image/${encodeURIComponent(originalUrl)}?${params.toString()}`;
  } catch (_err) {
    return originalUrl;
  }
}

export function buildProxiedImageUrl(originalUrl, blockId) {
  const stableUrl = toStableNotionImageUrl(originalUrl, blockId);
  const finalUrl = toProxyUrl(stableUrl || originalUrl);
  return { stableUrl, finalUrl };
}
