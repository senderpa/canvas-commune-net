import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface ParticleExplosionProps {
  x: number;
  y: number;
  isActive: boolean;
  onComplete: () => void;
}

export const ParticleExplosion = ({ x, y, isActive, onComplete }: ParticleExplosionProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) return;

    // Create explosion particles
    const newParticles: Particle[] = [];
    const particleCount = 15;
    const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#ff9ff3', '#ff8c42'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      newParticles.push({
        id: i,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    setParticles(newParticles);

    // Animate particles
    let animationId: number;
    const animate = () => {
      setParticles(prev => {
        const updated = prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vx: particle.vx * 0.98, // Friction
          vy: particle.vy * 0.98 + 0.1, // Gravity
          life: particle.life - 0.02
        })).filter(particle => particle.life > 0);

        if (updated.length === 0) {
          onComplete();
          return [];
        }

        animationId = requestAnimationFrame(animate);
        return updated;
      });
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isActive, x, y, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            backgroundColor: particle.color,
            opacity: particle.life,
            transform: `scale(${particle.life * 2})`
          }}
        />
      ))}
    </div>
  );
};