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
  
  // Draw minimap with actual stroke rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = size;
    canvas.height = size;
    
    // Save context
    ctx.save();
    
    // Apply zoom and pan transformations
    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-panX/zoomLevel, -panY/zoomLevel, size/zoomLevel, size/zoomLevel);
    
    // Draw light grid (adjusted for zoom)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1/zoomLevel;
    const gridSize = size / 20;
    for (let i = 0; i <= 20; i++) {
      const pos = i * gridSize;
      ctx.beginPath();
      ctx.moveTo(pos, -panY/zoomLevel);
      ctx.lineTo(pos, size/zoomLevel - panY/zoomLevel);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(-panX/zoomLevel, pos);
      ctx.lineTo(size/zoomLevel - panX/zoomLevel, pos);
      ctx.stroke();
    }
    
    // Draw all strokes as actual lines (not dots!)
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      // Convert world coordinates to minimap coordinates
      const minimapPoints = stroke.points.map(point => ({
        x: (point.x / worldSize) * size,
        y: (point.y / worldSize) * size
      }));

      // Check if stroke is visible in current view
      const viewLeft = -panX/zoomLevel;
      const viewTop = -panY/zoomLevel;
      const viewRight = viewLeft + size/zoomLevel;
      const viewBottom = viewTop + size/zoomLevel;
      
      const isVisible = minimapPoints.some(point => 
        point.x >= viewLeft - 50 && point.x <= viewRight + 50 &&
        point.y >= viewTop - 50 && point.y <= viewBottom + 50
      );

      if (isVisible) {
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.lineWidth = Math.max(0.5/zoomLevel, stroke.size / (20/zoomLevel));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (minimapPoints.length === 1) {
          // Single point - draw as circle
          const point = minimapPoints[0];
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(1/zoomLevel, stroke.size / (15/zoomLevel)), 0, 2 * Math.PI);
          ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
          ctx.fill();
        } else {
          // Multiple points - draw as connected smooth lines
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
    ctx.lineWidth = 3/zoomLevel;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
    // Player position dot
    const playerX = viewX + viewW / 2;
    const playerY = viewY + viewH / 2;
    
    ctx.fillStyle = '#ff0080';
    ctx.beginPath();
    ctx.arc(playerX, playerY, Math.max(2/zoomLevel, 5/zoomLevel), 0, 2 * Math.PI);
    ctx.fill();
    
    // Restore context
    ctx.restore();
    
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