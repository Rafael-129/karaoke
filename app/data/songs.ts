export type Song = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: string;
  lrcPreview: string;
  tags: string[];
  lrc: string;
  videoUrl?: string;
  instrumentalUrl?: string;
  status?: "processing" | "completed";
};

export const songs: Song[] = [];
