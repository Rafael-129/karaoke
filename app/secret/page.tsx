import MemoriesGallery from "../components/MemoriesGallery";
import Link from "next/link";
import { Heart, Sparkles } from "lucide-react";

export default function SecretPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="flex w-full items-center justify-between">
            <div className="rounded-full bg-rose-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 border border-rose-200">
              Feliz 1er Aniversario mi reina hermosa ❤️
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 shadow-sm border border-rose-100 flex items-center gap-2">
              <span>R + S</span>
              <span className="text-xs">♾️</span>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col gap-4">
            <h1 className="text-5xl font-black text-zinc-900 tracking-tight sm:text-6xl">
              Nuestro Cancionero <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500">Especial</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-medium text-rose-400/80">
              Un pequeo regalo hecho con muchsimo amor. Sube nuestras canciones favoritas, qutales la voz automticamente, y cantemos juntos hoy y siempre. ¡Te amo!
            </p>
          </div>
          
          <Link 
            href="/catalogo"
            className="rounded-full border border-black/10 bg-white px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 hover:bg-rose-50 hover:text-rose-500 transition-all"
          >
            Volver al Catálogo
          </Link>
        </header>

        <section className="mt-10">
          <MemoriesGallery />
        </section>
      </div>
    </div>
  );
}
