import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface WorldMinimapProps {
  worldX: number;
  worldY: number;
  strokes: Stroke[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const WorldMinimap = ({ worldX, worldY, strokes, isExpanded, onToggleExpanded }: WorldMinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(1581); // Center of world
  const [panY, setPanY] = useState(1581); // Center of world
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(true);

  const worldSize = 3162;
  const minimapSize = isExpanded ? 600 : 150;

  // Blinking animation for player position
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Draw a single stroke on the minimap
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    // Convert world coordinates to canvas coordinates
    const canvasPoints = stroke.points.map(point => ({
      x: ((point.x - panX) * zoom) + minimapSize / 2,
      y: ((point.y - panY) * zoom) + minimapSize / 2
    }));

    // Check if stroke is visible
    const isVisible = canvasPoints.some(point => 
      point.x >= -10 && point.x <= minimapSize + 10 &&
      point.y >= -10 && point.y <= minimapSize + 10
    );

    if (!isVisible) return;

    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = Math.max(0.1, stroke.size * zoom * (isExpanded ? 2 : 0.5));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (canvasPoints.length === 1) {
      // Single point
      const point = canvasPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.1, stroke.size * zoom * (isExpanded ? 1 : 0.25)), 0, 2 * Math.PI);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      // Multiple points - draw connected path
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      ctx.stroke();
    }
  }, [zoom, panX, panY, minimapSize, isExpanded]);

  // Render the complete minimap
  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, minimapSize, minimapSize);

    // Draw world boundary if zoomed out enough
    if (zoom < 0.5) {
      const boundaryX = ((0 - panX) * zoom) + minimapSize / 2;
      const boundaryY = ((0 - panY) * zoom) + minimapSize / 2;
      const boundaryWidth = worldSize * zoom;
      const boundaryHeight = worldSize * zoom;

      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(boundaryX, boundaryY, boundaryWidth, boundaryHeight);
    }

    // Draw grid if zoomed in enough
    if (zoom > 0.1) {
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 0.5;
      
      const gridSpacing = Math.max(50, 100 / zoom);
      const startX = Math.floor(panX / gridSpacing) * gridSpacing;
      const startY = Math.floor(panY / gridSpacing) * gridSpacing;
      
      for (let x = startX - gridSpacing * 5; x <= startX + gridSpacing * 5; x += gridSpacing) {
        const canvasX = ((x - panX) * zoom) + minimapSize / 2;
        if (canvasX >= 0 && canvasX <= minimapSize) {
          ctx.beginPath();
          ctx.moveTo(canvasX, 0);
          ctx.lineTo(canvasX, minimapSize);
          ctx.stroke();
        }
      }
      
      for (let y = startY - gridSpacing * 5; y <= startY + gridSpacing * 5; y += gridSpacing) {
        const canvasY = ((y - panY) * zoom) + minimapSize / 2;
        if (canvasY >= 0 && canvasY <= minimapSize) {
          ctx.beginPath();
          ctx.moveTo(0, canvasY);
          ctx.lineTo(minimapSize, canvasY);
          ctx.stroke();
        }
      }
    }

    // Draw all strokes
    strokes.forEach(stroke => drawStroke(ctx, stroke));

    // Draw player position with blinking dot
    const playerCanvasX = ((worldX - panX) * zoom) + minimapSize / 2;
    const playerCanvasY = ((worldY - panY) * zoom) + minimapSize / 2;

    if (playerCanvasX >= 0 && playerCanvasX <= minimapSize && 
        playerCanvasY >= 0 && playerCanvasY <= minimapSize && isBlinking) {
      ctx.beginPath();
      ctx.arc(playerCanvasX, playerCanvasY, Math.max(2, 4 * zoom), 0, 2 * Math.PI);
      ctx.fillStyle = '#ff0000';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [strokes, worldX, worldY, drawStroke, zoom, panX, panY, minimapSize, isBlinking]);

  // Update canvas when anything changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = minimapSize;
    canvas.height = minimapSize;
    renderMinimap();
  }, [renderMinimap, minimapSize]);

  // Mouse handlers for expanded mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded) return;
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isExpanded) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setPanX(prev => prev - deltaX / zoom);
    setPanY(prev => prev - deltaY / zoom);
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isExpanded) return;
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldMouseX = panX + (mouseX - minimapSize / 2) / zoom;
    const worldMouseY = panY + (mouseY - minimapSize / 2) / zoom;
    
    const zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
    
    setPanX(worldMouseX - (mouseX - minimapSize / 2) / newZoom);
    setPanY(worldMouseY - (mouseY - minimapSize / 2) / newZoom);
    setZoom(newZoom);
  };

  return (
    <div className={`${isExpanded ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : 'fixed bottom-4 right-4 z-10'}`}>
      <div className={`bg-card border border-border rounded-lg shadow-xl ${isExpanded ? 'p-6 max-w-4xl w-full mx-4' : 'p-2'}`}>
        {isExpanded && (
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Complete World Map</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setZoom(0.15);
                  setPanX(worldSize / 2);
                  setPanY(worldSize / 2);
                }}
              >
                Fit World
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPanX(worldX);
                  setPanY(worldY);
                  setZoom(2);
                }}
              >
                Go to Me
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggleExpanded}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={minimapSize}
            height={minimapSize}
            className={`border border-border rounded bg-white ${isExpanded ? 'cursor-move' : 'cursor-pointer'}`}
            style={{ width: minimapSize, height: minimapSize }}
            onClick={!isExpanded ? onToggleExpanded : undefined}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          
          {isExpanded && (
            <>
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                Scale: {zoom < 1 ? `1:${Math.round(1/zoom)}` : `${Math.round(zoom)}:1`}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                Center: ({Math.round(panX)}, {Math.round(panY)})
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                💡 Drag to pan, scroll to zoom
              </div>
            </>
          )}
          
          {!isExpanded && (
            <div className="absolute -top-8 right-0 text-xs text-muted-foreground">
              World Map
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldMinimap;