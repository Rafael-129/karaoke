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
};

const demoLrc = `
[00:08.00] Luces caen como lluvia
[00:12.10] Caminamos sin mirar atras
[00:17.50] Tu voz rompe la ciudad
[00:22.40] Todo gira a nuestro alrededor
[00:27.80] Seguimos el pulso del mar
[00:33.20] Hasta ver el sol entrar
`;

export const songs: Song[] = [
  {
    id: "1",
    title: "Luz de Media Noche",
    artist: "Neon Violeta",
    bpm: 102,
    duration: "3:42",
    lrcPreview: "[00:12.10] Caminamos sin mirar atras",
    tags: ["pop", "romantica"],
    lrc: demoLrc,
  },
  {
    id: "2",
    title: "Ciudad de Papel",
    artist: "Mar Sur",
    bpm: 118,
    duration: "4:05",
    lrcPreview: "[00:08.00] Luces caen como lluvia",
    tags: ["indie", "chill"],
    lrc: demoLrc,
  },
  {
    id: "3",
    title: "Motor de Estrellas",
    artist: "Ritmo Lunar",
    bpm: 126,
    duration: "3:18",
    lrcPreview: "[00:15.40] Brilla el cielo sobre mi",
    tags: ["dance", "energica"],
    lrc: demoLrc,
  },
  {
    id: "4",
    title: "Arena y Sal",
    artist: "Costa Azul",
    bpm: 96,
    duration: "4:22",
    lrcPreview: "[00:05.20] Vuelve el mar a hablar",
    tags: ["latina", "suave"],
    lrc: demoLrc,
  },
];
