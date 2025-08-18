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
  const [isReverse, setIsReverse] = useState(true); // Start with reverse
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(0.15); // Start zoomed out to show full canvas
  const [panX, setPanX] = useState(1581); // Center of world
  const [panY, setPanY] = useState(1581); // Center of world
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const canvasSize = 800; // Larger canvas for better visibility
  const worldSize = 3162;

  // Sort strokes by timestamp
  const sortedStrokes = [...strokes].sort((a, b) => a.timestamp - b.timestamp);

  // Draw stroke on canvas - fixed coordinate system
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = Math.max(0.5, stroke.size * zoom);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Convert world coordinates to canvas coordinates
    const canvasPoints = stroke.points.map(point => ({
      x: ((point.x - panX) * zoom) + canvasSize / 2,
      y: ((point.y - panY) * zoom) + canvasSize / 2
    }));

    // Check if any part of stroke is visible
    const isVisible = canvasPoints.some(point => 
      point.x >= -stroke.size * zoom && point.x <= canvasSize + stroke.size * zoom &&
      point.y >= -stroke.size * zoom && point.y <= canvasSize + stroke.size * zoom
    );

    if (!isVisible) return;

    if (canvasPoints.length === 1) {
      // Single point
      const point = canvasPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.5, stroke.size * zoom / 2), 0, 2 * Math.PI);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      // Multiple points - draw connected lines
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      ctx.stroke();
    }
  }, [zoom, panX, panY, canvasSize]);

  // Render animation up to current stroke
  const renderAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw light grid for reference
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    const gridSpacing = Math.max(20, 100 * zoom);
    for (let i = 0; i < canvasSize; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvasSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvasSize, i);
      ctx.stroke();
    }

    // Draw all strokes up to current index
    for (let i = 0; i <= currentStrokeIndex && i < sortedStrokes.length; i++) {
      drawStroke(ctx, sortedStrokes[i]);
    }
  }, [currentStrokeIndex, sortedStrokes, drawStroke, zoom, panX, panY, canvasSize]);

  // Animation loop - auto-start when opened, start from end for reverse
  useEffect(() => {
    if (isOpen && sortedStrokes.length > 0) {
      setIsPlaying(true);
      setCurrentStrokeIndex(sortedStrokes.length - 1); // Start from end for reverse
      setIsReverse(true);
    }
  }, [isOpen, sortedStrokes.length]);

  useEffect(() => {
    if (isPlaying) {
      const timeout = setTimeout(() => {
        if (isReverse) {
          // Going backward
          if (currentStrokeIndex > 0) {
            setCurrentStrokeIndex(prev => prev - 1);
          } else {
            // Reached start, switch to forward
            setIsReverse(false);
          }
        } else {
          // Going forward
          if (currentStrokeIndex < sortedStrokes.length - 1) {
            setCurrentStrokeIndex(prev => prev + 1);
          } else {
            // Reached end, switch to reverse
            setIsReverse(true);
          }
        }
      }, Math.max(50, 200 / speed));

      return () => clearTimeout(timeout);
    }
  }, [isPlaying, currentStrokeIndex, sortedStrokes.length, speed, isReverse]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    renderAnimation();
  }, [renderAnimation, canvasSize]);

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setCurrentStrokeIndex(sortedStrokes.length - 1);
    setIsReverse(true);
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
    
    // Convert mouse position to world coordinates
    const worldX = panX + (mouseX - canvasSize / 2) / zoom;
    const worldY = panY + (mouseY - canvasSize / 2) / zoom;
    
    const zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
    const newZoom = Math.max(0.1, Math.min(20, zoom * zoomFactor));
    
    // Keep the mouse position fixed during zoom
    setPanX(worldX - (mouseX - canvasSize / 2) / newZoom);
    setPanY(worldY - (mouseY - canvasSize / 2) / newZoom);
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
            width={canvasSize}
            height={canvasSize}
            className="border border-border rounded bg-white cursor-move max-w-full"
            style={{ width: '100%', aspectRatio: '1', maxHeight: '70vh' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          
          {/* Zoom indicator */}
          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            Zoom: {Math.round(zoom * worldSize / canvasSize * 100)}%
          </div>
          
          {/* World position indicator */}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            World: ({Math.round(panX)}, {Math.round(panY)})
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
                onClick={() => setZoom(prev => Math.min(20, prev * 2))}
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
                  setZoom(0.15);
                  setPanX(worldSize / 2);
                  setPanY(worldSize / 2);
                }}
              >
                Fit All
              </Button>
            </div>
            
            <div className="flex-1 text-center text-sm text-muted-foreground">
              {currentStrokeIndex + 1} / {sortedStrokes.length} strokes {isReverse ? '⏪' : '⏩'}
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