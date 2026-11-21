// Public links of the project (KAN-35). Fill in after publishing; empty string = not published yet.

export const PROJECT_LINKS = {
  /** YouTube ("publiczny" or "niepubliczny z linkiem") or a direct video file URL. */
  videoUrl: "",
  /** Production demo (Vercel). */
  demoUrl: "",
  repoUrl: "https://github.com/Hubertcior/zasilkowy-przewodnik",
  /** Slides (docs/prezentacja.html) – link to the file in the repository. */
  presentationUrl: "https://github.com/Hubertcior/zasilkowy-przewodnik/blob/main/docs/prezentacja.html",
  descriptionUrl: "https://github.com/Hubertcior/zasilkowy-przewodnik/blob/main/docs/opis-projektu.md",
} as const;

/** Embeddable URL for YouTube links (privacy-enhanced domain), otherwise null. */
export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
