import { useEffect, useRef } from 'react';
import { useRealTimeStrokes } from '@/hooks/useRealTimeStrokes';

interface LivePreviewProps {
  playerCount: number;
}

export const LivePreview = ({ playerCount }: LivePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strokes } = useRealTimeStrokes();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 0.02; // Scale factor to fit 10000x10000 world into small preview
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw strokes
    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * scale * 0.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      stroke.points.forEach((point: any, index: number) => {
        const x = centerX + (point.x * scale);
        const y = centerY + (point.y * scale);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });
  }, [strokes]);

  // Only show if there are active players
  if (playerCount === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg p-3 mb-4">
      <div className="text-xs text-muted-foreground mb-2 text-center">
        Live Preview
      </div>
      <div className="relative bg-black rounded overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
          {playerCount} painting
        </div>
      </div>
    </div>
  );
};