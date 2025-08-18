import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from './ui/button';

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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
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
      
      // Convert world coordinates to minimap coordinates with zoom and pan
      const minimapPoints = stroke.points.map(point => ({
        x: ((point.x / worldSize) * size * zoomLevel) + panX,
        y: ((point.y / worldSize) * size * zoomLevel) + panY
      }));

      // Only draw if any point is within bounds
      const inBounds = minimapPoints.some(point => 
        point.x >= 0 && point.x < size && point.y >= 0 && point.y < size
      );

      if (inBounds) {
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.lineWidth = Math.max(2, (stroke.size / 4) * zoomLevel); // Better visibility with zoom
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (minimapPoints.length === 1) {
          // Single point - draw as larger circle with zoom
          const point = minimapPoints[0];
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(2, (stroke.size / 6) * zoomLevel), 0, 2 * Math.PI);
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
    
    // Draw current viewport rectangle with zoom and pan
    const viewX = ((worldX / worldSize) * size * zoomLevel) + panX;
    const viewY = ((worldY / worldSize) * size * zoomLevel) + panY;
    const viewW = (viewportSize / worldSize) * size * zoomLevel;
    const viewH = (viewportSize / worldSize) * size * zoomLevel;
    
    // Viewport outline with stronger visibility
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 3; // Thicker line
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
    // Player position dot (larger)
    const playerX = viewX + viewW / 2;
    const playerY = viewY + viewH / 2;
    
    ctx.fillStyle = '#ff0080';
    ctx.beginPath();
    ctx.arc(playerX, playerY, Math.max(3, 5 * zoomLevel), 0, 2 * Math.PI); // Scale with zoom
    ctx.fill();
    
  }, [worldX, worldY, strokes, zoomLevel, panX, panY]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel * delta));
    setZoomLevel(newZoom);
  }, [zoomLevel]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Pan to center clicked point
    const newPanX = (size / 2) - x;
    const newPanY = (size / 2) - y;
    setPanX(newPanX);
    setPanY(newPanY);
  }, [size]);

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">World Map</div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomLevel(1)}
            className="text-xs h-6 px-2"
          >
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setPanX(0); setPanY(0); }}
            className="text-xs h-6 px-2"
          >
            Center
          </Button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="border border-border rounded bg-white cursor-pointer"
        style={{ width: `${size}px`, height: `${size}px` }}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        {strokes.length} strokes • Zoom: {zoomLevel.toFixed(1)}x • Scroll to zoom, click to center
      </div>
    </div>
  );
};

export default Minimap;