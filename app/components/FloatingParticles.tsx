"use client";

import { useEffect, useState } from "react";

// Generate static initial positions to avoid hydration mismatches, 
// then randomize slightly on the client.
const PARTICLE_COUNT = 15;

export default function FloatingParticles() {
  const [particles, setParticles] = useState<
    { id: number; left: string; delay: string; size: string; opacity: string }[]
  >([]);

  useEffect(() => {
    // We only generate these on the client so hydration matches the empty initial state
    const generated = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
      const size = Math.random() * 8 + 4; // 4px to 12px
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 15}s`,
        size: `${size}px`,
        opacity: `${Math.random() * 0.3 + 0.1}`, // 0.1 to 0.4 opacity
      };
    });
    setParticles(generated);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute -bottom-10 animate-float-up rounded-full bg-rose-300 blur-[1px]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
