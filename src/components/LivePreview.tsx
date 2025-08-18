import { useEffect, useRef, useState } from 'react';
import { useRealTimeStrokes } from '@/hooks/useRealTimeStrokes';

interface LivePreviewProps {
  playerCount: number;
}

export const LivePreview = ({ playerCount }: LivePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strokes } = useRealTimeStrokes();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Select a random player when strokes change
  useEffect(() => {
    if (strokes.length === 0) {
      setSelectedPlayerId(null);
      return;
    }

    const uniquePlayerIds = [...new Set(strokes.map(stroke => stroke.player_id))];
    
    if (uniquePlayerIds.length > 0 && !selectedPlayerId) {
      // Pick a random player
      const randomId = uniquePlayerIds[Math.floor(Math.random() * uniquePlayerIds.length)];
      setSelectedPlayerId(randomId);
    }

    // Occasionally switch to a different random player (every 10 seconds)
    const switchPlayer = () => {
      if (uniquePlayerIds.length > 1) {
        const otherPlayers = uniquePlayerIds.filter(id => id !== selectedPlayerId);
        if (otherPlayers.length > 0) {
          const newRandomId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          setSelectedPlayerId(newRandomId);
        }
      }
    };

    const interval = setInterval(switchPlayer, 10000);
    return () => clearInterval(interval);
  }, [strokes, selectedPlayerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!selectedPlayerId) return;

    // Filter strokes by selected player and get recent ones (last 50)
    const playerStrokes = strokes
      .filter(stroke => stroke.player_id === selectedPlayerId)
      .slice(-50);

    if (playerStrokes.length === 0) return;

    // Calculate bounds of player's strokes for centering
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    playerStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      stroke.points.forEach((point: any) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });

    // Calculate scale and offset to center the player's area
    const strokeWidth = maxX - minX;
    const strokeHeight = maxY - minY;
    const scale = Math.min(canvas.width / (strokeWidth + 1000), canvas.height / (strokeHeight + 1000), 0.05);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const strokeCenterX = (minX + maxX) / 2;
    const strokeCenterY = (minY + maxY) / 2;

    // Draw strokes
    playerStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      stroke.points.forEach((point: any, index: number) => {
        const x = centerX + (point.x - strokeCenterX) * scale;
        const y = centerY + (point.y - strokeCenterY) * scale;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });
  }, [strokes, selectedPlayerId]);

  // Only show if there are active players
  if (playerCount === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg p-3 mb-4">
      <div className="text-xs text-muted-foreground mb-2 text-center">
        Live Preview - Random Player
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