import { describe, expect, it } from "vitest";
import { youtubeEmbed } from "@/data/project";

describe("youtubeEmbed", () => {
  it("turns YouTube links into privacy-enhanced embeds, ignores other URLs", () => {
    expect(youtubeEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbed("https://youtu.be/dQw4w9WgXcQ?t=3")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbed("https://example.com/film.mp4")).toBeNull();
  });
});
