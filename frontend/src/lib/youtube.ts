/** Extract 11-char YouTube video id from common URL shapes. */
export function getYouTubeVideoId(raw: string): string | null {
  const s = raw.trim();
  if (!s || !/youtu\.be|youtube\.com/i.test(s)) return null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    let id: string | null = null;
    if (u.hostname === "youtu.be") {
      id = u.pathname.replace(/^\//, "").split("/")[0] || null;
    } else if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) {
        id = u.pathname.slice("/embed/".length).split("/")[0] || null;
      } else {
        id = u.searchParams.get("v");
      }
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}
