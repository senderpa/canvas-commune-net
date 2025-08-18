import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface AnimationReplayProps {
  strokes: Stroke[];
  isOpen: boolean;
  onClose: () => void;
}

const AnimationReplay = ({ strokes, isOpen, onClose }: AnimationReplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  const size = 600;
  const worldSize = 1000000;

  // Sort strokes by timestamp
  const sortedStrokes = [...strokes].sort((a, b) => a.timestamp - b.timestamp);

  // Draw stroke on canvas with zoom and pan
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    // Convert world coordinates to canvas coordinates with zoom and pan
    const canvasPoints = stroke.points.map(point => ({
      x: ((point.x / worldSize) * size - panX) * zoom + size / 2,
      y: ((point.y / worldSize) * size - panY) * zoom + size / 2
    }));

    // Check if stroke is visible in viewport
    const isVisible = canvasPoints.some(point => 
      point.x >= -stroke.size && point.x <= size + stroke.size &&
      point.y >= -stroke.size && point.y <= size + stroke.size
    );

    if (!isVisible) return;

    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = Math.max(0.5, (stroke.size * zoom) / 5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (canvasPoints.length === 1) {
      // Single point
      const point = canvasPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.5, (stroke.size * zoom) / 10), 0, 2 * Math.PI);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      // Multiple points
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      ctx.stroke();
    }
  }, [zoom, panX, panY]);

  // Render animation up to current stroke with zoom and pan
  const renderAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw grid based on zoom level
    ctx.strokeStyle = zoom > 10 ? '#f8f8f8' : '#f0f0f0';
    ctx.lineWidth = 1;
    
    const gridSpacing = Math.max(10, 50 / zoom);
    const startX = Math.floor((-panX * zoom + size / 2) / gridSpacing) * gridSpacing;
    const startY = Math.floor((-panY * zoom + size / 2) / gridSpacing) * gridSpacing;
    
    for (let x = startX; x < size + gridSpacing; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    
    for (let y = startY; y < size + gridSpacing; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Draw all strokes up to current index
    for (let i = 0; i <= currentStrokeIndex && i < sortedStrokes.length; i++) {
      drawStroke(ctx, sortedStrokes[i]);
    }
  }, [currentStrokeIndex, sortedStrokes, drawStroke, zoom, panX, panY]);

  // Animation loop
  useEffect(() => {
    if (isPlaying && currentStrokeIndex < sortedStrokes.length - 1) {
      const timeout = setTimeout(() => {
        setCurrentStrokeIndex(prev => prev + 1);
      }, 100 / speed); // Adjust speed

      return () => clearTimeout(timeout);
    } else if (currentStrokeIndex >= sortedStrokes.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStrokeIndex, sortedStrokes.length, speed]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size;
    canvas.height = size;
    renderAnimation();
  }, [renderAnimation]);

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setCurrentStrokeIndex(0);
    setIsPlaying(false);
  };

  // Mouse handlers for zoom and pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
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
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - size / 2) / zoom + panX;
    const worldY = (mouseY - size / 2) / zoom + panY;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(100, zoom * zoomFactor));
    
    setPanX(worldX - (mouseX - size / 2) / newZoom);
    setPanY(worldY - (mouseY - size / 2) / newZoom);
    setZoom(newZoom);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg border border-border max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Complete Artwork Evolution</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="mb-4 relative">
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="border border-border rounded bg-white cursor-move"
            style={{ width: '100%', maxWidth: '600px', aspectRatio: '1' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          
          {/* Zoom indicator */}
          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handlePlay}
              disabled={sortedStrokes.length === 0}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={sortedStrokes.length === 0}
            >
              Reset
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(prev => Math.min(100, prev * 2))}
              >
                Zoom In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(prev => Math.max(0.1, prev / 2))}
              >
                Zoom Out
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setZoom(1);
                  setPanX(0);
                  setPanY(0);
                }}
              >
                Reset View
              </Button>
            </div>
            
            <div className="flex-1 text-center text-sm text-muted-foreground">
              {currentStrokeIndex + 1} / {sortedStrokes.length} strokes
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Speed:</span>
            <Button
              size="sm"
              variant={speed === 0.5 ? 'default' : 'outline'}
              onClick={() => setSpeed(0.5)}
            >
              0.5x
            </Button>
            <Button
              size="sm"
              variant={speed === 1 ? 'default' : 'outline'}
              onClick={() => setSpeed(1)}
            >
              1x
            </Button>
            <Button
              size="sm"
              variant={speed === 2 ? 'default' : 'outline'}
              onClick={() => setSpeed(2)}
            >
              2x
            </Button>
            <Button
              size="sm"
              variant={speed === 4 ? 'default' : 'outline'}
              onClick={() => setSpeed(4)}
            >
              4x
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            💡 Use mouse wheel to zoom, drag to pan around the artwork
          </div>

          {sortedStrokes.length === 0 && (
            <p className="text-center text-muted-foreground">
              No strokes to animate yet. Start drawing to see the evolution!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimationReplay;