"use client";

import { useState } from "react";
import { Sparkles, Heart, X } from "lucide-react";

const IMAGES = [
  "WhatsApp Image 2026-05-11 at 6.50.53 PM (1).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.53 PM.jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.54 PM.jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.56 PM (1).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.56 PM (2).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.56 PM (3).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.56 PM.jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.57 PM (1).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.57 PM (2).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.57 PM (3).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.57 PM (4).jpeg",
  "WhatsApp Image 2026-05-11 at 6.50.57 PM.jpeg",
  "WhatsApp Image 2026-05-11 at 6.51.04 PM (1).jpeg",
  "WhatsApp Image 2026-05-11 at 6.51.04 PM (2).jpeg",
  "WhatsApp Image 2026-05-11 at 6.51.04 PM (3).jpeg",
  "WhatsApp Image 2026-05-11 at 6.51.04 PM.jpeg",
  "WhatsApp Image 2026-05-11 at 6.51.05 PM (1).jpeg",
  "WhatsApp Image 2026-05-11 at 6.51.05 PM.jpeg",
  "WhatsApp Image 2026-05-12 at 1.00.36 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 1.02.49 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 1.03.07 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 1.04.10 AM (1).jpeg",
  "WhatsApp Image 2026-05-12 at 1.04.10 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 1.08.17 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 12.12.57 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 12.46.27 AM.jpeg",
  "WhatsApp Image 2026-05-12 at 12.57.52 AM.jpeg",
];

const VIDEOS = [
  "WhatsApp Video 2026-05-11 at 6.51.03 PM.mp4",
  "WhatsApp Video 2026-05-11 at 6.51.04 PM.mp4",
];

export default function MemoriesGallery() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
      {/* Modal Overlay */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            <X className="h-10 w-10" />
          </button>
          
          <div 
            className="relative flex items-center justify-center max-w-full max-h-full animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`/memories/${encodeURIComponent(selectedImage)}`} 
              alt="Recuerdo ampliado" 
              className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      <div className="mb-12 flex flex-col items-center text-center space-y-4">
        <div className="inline-flex items-center justify-center rounded-full bg-rose-100 p-4 text-rose-500 shadow-inner">
          <Heart className="h-10 w-10 animate-pulse fill-rose-500" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-rose-500 tracking-tight drop-shadow-sm">
          Te amo mucho
          <br /> mi Sandrita hermosa
        </h1>
        <p className="text-lg md:text-xl font-medium text-rose-400/80 max-w-2xl mt-4">
          Un rinconcito secreto solo para nosotros. Cada momento a tu lado es mi canción favorita. ✨
        </p>
      </div>

      {/* Videos Section (Highlighted at the top) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mb-12">
        {VIDEOS.map((video, i) => (
          <div 
            key={video} 
            className={`flex flex-col bg-white p-4 pb-8 rounded-sm shadow-[0_10px_30px_rgb(251,113,133,0.2)] transform transition-transform duration-500 hover:scale-105 hover:z-10 ${i % 2 === 0 ? '-rotate-2' : 'rotate-2'}`}
          >
            <video 
              src={`/memories/${video}`} 
              controls 
              className="w-full rounded-sm object-cover bg-black/5"
            />
            <div className="mt-4 flex items-center justify-center gap-2 text-rose-400 font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Nuestro momento mágico</span>
            </div>
          </div>
        ))}
      </div>

      {/* Masonry Polaroid Gallery */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-6 w-full max-w-7xl pb-20 space-y-6">
        {IMAGES.map((img, i) => {
          // Generar una rotación aleatoria leve para cada polaroid para que parezca esparcido
          const rotation = i % 2 === 0 ? `rotate-[${(i % 4) + 1}deg]` : `-rotate-[${(i % 4) + 1}deg]`;
          
          return (
            <div 
              key={img} 
              className="break-inside-avoid"
              onClick={() => setSelectedImage(img)}
            >
              <div className={`bg-white p-3 pb-8 rounded-sm shadow-md transition-all duration-300 hover:scale-110 hover:shadow-xl hover:z-20 cursor-pointer relative ${
                i % 3 === 0 ? '-rotate-2' : i % 2 === 0 ? 'rotate-3' : '-rotate-1'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`/memories/${encodeURIComponent(img)}`} 
                  alt="Recuerdo hermoso" 
                  loading="lazy"
                  className="w-full h-auto rounded-sm"
                />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <Heart className="h-4 w-4 inline-block text-rose-300 fill-rose-300/50" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
