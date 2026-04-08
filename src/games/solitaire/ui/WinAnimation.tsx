/**
 * Classic bouncing cards win animation (Windows 3.0 style).
 * Cards cascade from foundations, bouncing off edges with physics.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CARD_W, CARD_H } from './CardRenderer';
import { rankOf, suitOf, rankLabel, suitSymbol, colorOf } from '../engine/deck';
import type { CardId } from '../engine/types';

interface BouncingCard {
  id: CardId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
}

interface WinAnimationProps {
  width: number;
  height: number;
  enabled?: boolean;
}

export function WinAnimation({ width, height, enabled = true }: WinAnimationProps) {
  const [cards, setCards] = useState<BouncingCard[]>([]);
  const [trails, setTrails] = useState<{ x: number; y: number; id: CardId; opacity: number }[]>([]);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const cardsRef = useRef<BouncingCard[]>([]);

  const spawnCard = useCallback(() => {
    const id = Math.floor(Math.random() * 52);
    const card: BouncingCard = {
      id,
      x: Math.random() * (width - CARD_W),
      y: -CARD_H,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 2 + 1,
      rotation: (Math.random() - 0.5) * 30,
      vr: (Math.random() - 0.5) * 5,
    };
    cardsRef.current = [...cardsRef.current, card].slice(-30); // max 30 cards
  }, [width]);

  useEffect(() => {
    if (!enabled) return;

    const gravity = 0.3;
    const bounceFactor = 0.7;
    const friction = 0.99;

    let spawnTimer = 0;

    const animate = () => {
      frameRef.current++;
      spawnTimer++;

      // Spawn new card every ~15 frames
      if (spawnTimer >= 15) {
        spawnCard();
        spawnTimer = 0;
      }

      // Update physics
      const updated = cardsRef.current.map(c => {
        let { x, y, vx, vy, rotation, vr } = c;

        vy += gravity;
        x += vx;
        y += vy;
        rotation += vr;
        vx *= friction;

        // Bounce off bottom
        if (y + CARD_H > height) {
          y = height - CARD_H;
          vy = -vy * bounceFactor;
          vr *= 0.8;
        }

        // Bounce off sides
        if (x < 0) { x = 0; vx = -vx * bounceFactor; }
        if (x + CARD_W > width) { x = width - CARD_W; vx = -vx * bounceFactor; }

        return { ...c, x, y, vx, vy, rotation, vr };
      });

      cardsRef.current = updated;

      // Leave trails every 3 frames
      if (frameRef.current % 3 === 0) {
        const newTrails = updated.map(c => ({
          x: c.x, y: c.y, id: c.id, opacity: 0.3,
        }));
        setTrails(prev => [...prev, ...newTrails].slice(-200));
      }

      setCards([...updated]);

      // Fade trails
      setTrails(prev => prev
        .map(t => ({ ...t, opacity: t.opacity - 0.005 }))
        .filter(t => t.opacity > 0)
      );

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [enabled, width, height, spawnCard]);

  if (!enabled) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* Trails */}
      {trails.map((t, i) => (
        <MiniCard key={`trail-${i}`} id={t.id} x={t.x} y={t.y} opacity={t.opacity} />
      ))}

      {/* Active bouncing cards */}
      {cards.map((c, i) => (
        <g key={`card-${i}`} transform={`translate(${c.x},${c.y}) rotate(${c.rotation} ${CARD_W / 2} ${CARD_H / 2})`}>
          <MiniCard id={c.id} x={0} y={0} opacity={1} />
        </g>
      ))}
    </svg>
  );
}

function MiniCard({ id, x, y, opacity }: { id: CardId; x: number; y: number; opacity: number }) {
  const rank = rankOf(id);
  const suit = suitOf(id);
  const color = colorOf(id);
  const textColor = color === 'red' ? '#dc2626' : '#1e293b';

  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <rect width={CARD_W} height={CARD_H} rx={6} fill="#fff" stroke="#cbd5e1" strokeWidth={1} />
      <text x={5} y={15} fontSize={12} fontWeight={800} fill={textColor}>{rankLabel(rank)}</text>
      <text x={5} y={27} fontSize={11} fill={textColor}>{suitSymbol(suit)}</text>
      <text x={CARD_W / 2} y={CARD_H / 2 + 6} fontSize={22} fill={textColor} textAnchor="middle">{suitSymbol(suit)}</text>
    </g>
  );
}
