import { useEffect, useRef, useState } from 'react';
import { useRealTimeStrokes } from '@/hooks/useRealTimeStrokes';
import { useOtherPlayers } from '@/hooks/useOtherPlayers';

export const LivePreview = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strokes } = useRealTimeStrokes();
  const { otherPlayers } = useOtherPlayers();
  const [focusPlayer, setFocusPlayer] = useState<any>(null);

  // Get real-time accurate player count
  const activePlayerCount = otherPlayers.length;

  // Select a random active player to focus on
  useEffect(() => {
    if (otherPlayers.length === 0) {
      setFocusPlayer(null);
      return;
    }

    // Pick a random active player
    if (!focusPlayer || !otherPlayers.find(p => p.anonymous_id === focusPlayer.anonymous_id)) {
      const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      setFocusPlayer(randomPlayer);
    }

    // Switch to a different player every 15 seconds
    const interval = setInterval(() => {
      if (otherPlayers.length > 1) {
        const otherOptions = otherPlayers.filter(p => p.anonymous_id !== focusPlayer?.anonymous_id);
        if (otherOptions.length > 0) {
          const newPlayer = otherOptions[Math.floor(Math.random() * otherOptions.length)];
          setFocusPlayer(newPlayer);
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [otherPlayers, focusPlayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !focusPlayer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Define viewport around the focused player (16:9 area)
    const viewportWidth = 1600; // World units
    const viewportHeight = 900;  // World units (16:9 ratio)
    const centerX = focusPlayer.general_area_x;
    const centerY = focusPlayer.general_area_y;

    const left = centerX - viewportWidth / 2;
    const right = centerX + viewportWidth / 2;
    const top = centerY - viewportHeight / 2;
    const bottom = centerY + viewportHeight / 2;

    // Scale to fit canvas
    const scaleX = canvas.width / viewportWidth;
    const scaleY = canvas.height / viewportHeight;

    // Filter and draw strokes within the viewport
    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      // Check if stroke intersects with viewport
      const strokeInViewport = stroke.points.some((point: any) => 
        point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
      );

      if (!strokeInViewport) return;

      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * scaleX * 0.8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      stroke.points.forEach((point: any, index: number) => {
        const x = (point.x - left) * scaleX;
        const y = (point.y - top) * scaleY;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });

    // Draw the focused player's cursor/position
    ctx.fillStyle = focusPlayer.current_color || '#ffffff';
    ctx.beginPath();
    ctx.arc(
      (focusPlayer.general_area_x - left) * scaleX, 
      (focusPlayer.general_area_y - top) * scaleY, 
      Math.max(3, focusPlayer.current_size * scaleX * 0.5), 
      0, 
      Math.PI * 2
    );
    ctx.fill();

  }, [strokes, focusPlayer]);

  // Only show if there are active players
  if (activePlayerCount === 0 || !focusPlayer) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg p-2 mb-4">
      <div className="text-xs text-muted-foreground mb-1 text-center">
        Live Preview
      </div>
      <div className="relative bg-black rounded overflow-hidden" style={{ aspectRatio: '16/9', maxWidth: '200px', margin: '0 auto' }}>
        <canvas
          ref={canvasRef}
          width={200}
          height={112}
          className="w-full h-full"
          style={{ imageRendering: 'auto' }}
        />
        <div className="absolute top-0.5 left-0.5 bg-black/50 text-white text-xs px-1 rounded">
          {activePlayerCount} live
        </div>
      </div>
    </div>
  );
};