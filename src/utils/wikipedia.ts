export async function fetchWikipediaSummary(query: string): Promise<{ title: string; extract: string } | null> {
  if (!query || !query.trim()) return null;
  const clean = query.trim().split(/[\s,]+/)[0]; // take the prime keyword or first 2 words
  const fullQuery = query.trim().split(/[\s,]+/).slice(0, 3).join(' ');

  try {
    const encoded = encodeURIComponent(fullQuery);
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.extract) {
        return {
          title: data.title || fullQuery,
          extract: data.extract
        };
      }
    }
  } catch {
    // try fallback with single word
    try {
      const encodedSingle = encodeURIComponent(clean);
      const res2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedSingle}`);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.extract) {
          return {
            title: data2.title || clean,
            extract: data2.extract
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}
