import { useRef, useEffect } from 'react';
import { Button } from './ui/button';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface SmallMinimapProps {
  worldX: number;
  worldY: number;
  strokes: Stroke[];
  onOpenFullMinimap: () => void;
}

const SmallMinimap = ({ worldX, worldY, strokes, onOpenFullMinimap }: SmallMinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 200; // 3x smaller than 600
  const worldSize = 1000000;
  const viewportSize = 512;
  
  // Draw small minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = size;
    canvas.height = size;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Draw all strokes as actual lines
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      // Convert world coordinates to minimap coordinates
      const minimapPoints = stroke.points.map(point => ({
        x: (point.x / worldSize) * size,
        y: (point.y / worldSize) * size
      }));

      // Only draw if any point is within bounds
      const inBounds = minimapPoints.some(point => 
        point.x >= -10 && point.x <= size + 10 && point.y >= -10 && point.y <= size + 10
      );

      if (inBounds) {
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.lineWidth = Math.max(0.5, stroke.size / 15); // Very thin for small view
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (minimapPoints.length === 1) {
          // Single point - draw as tiny circle
          const point = minimapPoints[0];
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(0.5, stroke.size / 20), 0, 2 * Math.PI);
          ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
          ctx.fill();
        } else {
          // Multiple points - draw as connected lines
          ctx.beginPath();
          ctx.moveTo(minimapPoints[0].x, minimapPoints[0].y);
          for (let i = 1; i < minimapPoints.length; i++) {
            ctx.lineTo(minimapPoints[i].x, minimapPoints[i].y);
          }
          ctx.stroke();
        }
      }
    });
    
    // Draw current viewport rectangle
    const viewX = (worldX / worldSize) * size;
    const viewY = (worldY / worldSize) * size;
    const viewW = (viewportSize / worldSize) * size;
    const viewH = (viewportSize / worldSize) * size;
    
    // Viewport outline
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
    // Player position dot (small)
    const playerX = viewX + viewW / 2;
    const playerY = viewY + viewH / 2;
    
    ctx.fillStyle = '#ff0080';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 2, 0, 2 * Math.PI);
    ctx.fill();
    
  }, [worldX, worldY, strokes]);

  return (
    <div className="fixed bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-xs text-muted-foreground">Map</div>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenFullMinimap}
          className="text-xs h-5 px-2"
        >
          ⛶
        </Button>
      </div>
      
      <canvas
        ref={canvasRef}
        className="border border-border rounded bg-white"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      
      <div className="text-xs text-muted-foreground mt-1 text-center">
        {strokes.length} strokes
      </div>
    </div>
  );
};

export default SmallMinimap;