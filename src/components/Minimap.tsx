import { useRef, useEffect, useCallback } from 'react';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface MinimapProps {
  worldX: number;
  worldY: number;
  strokes: Stroke[];
}

const Minimap = ({ worldX, worldY, strokes }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 600; // Doubled size
  const worldSize = 1000000;
  const viewportSize = 512;
  
  // Draw minimap
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
    
    // Draw light grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const gridSize = size / 20;
    for (let i = 0; i <= 20; i++) {
      const pos = i * gridSize;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
    
    // Draw all strokes as actual scaled lines
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      // Convert world coordinates to minimap coordinates
      const minimapPoints = stroke.points.map(point => ({
        x: (point.x / worldSize) * size,
        y: (point.y / worldSize) * size
      }));

      // Only draw if any point is within bounds
      const inBounds = minimapPoints.some(point => 
        point.x >= 0 && point.x < size && point.y >= 0 && point.y < size
      );

      if (inBounds) {
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.lineWidth = Math.max(1, stroke.size / 8); // Made strokes more visible
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (minimapPoints.length === 1) {
          // Single point - draw as larger circle
          const point = minimapPoints[0];
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(1, stroke.size / 12), 0, 2 * Math.PI);
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
    
    // Draw current viewport rectangle (made more visible)
    const viewX = (worldX / worldSize) * size;
    const viewY = (worldY / worldSize) * size;
    const viewW = (viewportSize / worldSize) * size;
    const viewH = (viewportSize / worldSize) * size;
    
    // Viewport outline with stronger visibility
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 3; // Thicker line
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
    // Player position dot (larger)
    const playerX = viewX + viewW / 2;
    const playerY = viewY + viewH / 2;
    
    ctx.fillStyle = '#ff0080';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 5, 0, 2 * Math.PI); // Larger dot
    ctx.fill();
    
  }, [worldX, worldY, strokes]);

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <div className="text-xs text-muted-foreground mb-2 text-center">World Map</div>
      
      <canvas
        ref={canvasRef}
        className="border border-border rounded bg-white"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        {strokes.length} strokes • Live view
      </div>
    </div>
  );
};

export default Minimap;