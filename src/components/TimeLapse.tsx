import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import { useRealTimeStrokes } from '@/hooks/useRealTimeStrokes';
import HighscoreList from './HighscoreList';

interface TimeLapseProps {
  isOpen: boolean;
  onClose: () => void;
}

const TimeLapse = ({ isOpen, onClose }: TimeLapseProps) => {
  const { strokes } = useRealTimeStrokes();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReverse, setIsReverse] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [zoom, setZoom] = useState(0.08); // Show full world initially
  const [panX, setPanX] = useState(5000); // Center of world
  const [panY, setPanY] = useState(5000);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isHighscoreOpen, setIsHighscoreOpen] = useState(false);
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(0.08);

  const canvasSize = 800;
  const worldSize = 10000;

  // Convert real-time strokes to animation format
  const sortedStrokes = useMemo(() => {
    return strokes
      .filter(stroke => stroke.tool === 'brush') // Only show brush strokes
      .map(stroke => ({
        id: stroke.id,
        points: stroke.points,
        color: stroke.color,
        size: stroke.size,
        tool: 'brush' as const,
        timestamp: new Date(stroke.created_at).getTime()
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [strokes]);

  // Draw stroke on canvas
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: any) => {
    if (stroke.points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(0.5, stroke.size * zoom);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Convert world coordinates to canvas coordinates
    const canvasPoints = stroke.points.map((point: any) => ({
      x: ((point.x - panX) * zoom) + canvasSize / 2,
      y: ((point.y - panY) * zoom) + canvasSize / 2
    }));

    // Check if stroke is visible
    const isVisible = canvasPoints.some((point: any) => 
      point.x >= -stroke.size * zoom && point.x <= canvasSize + stroke.size * zoom &&
      point.y >= -stroke.size * zoom && point.y <= canvasSize + stroke.size * zoom
    );

    if (!isVisible) return;

    if (canvasPoints.length === 1) {
      // Single point
      const point = canvasPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.5, stroke.size * zoom / 2), 0, 2 * Math.PI);
      ctx.fillStyle = stroke.color;
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

  // Render animation
  const renderAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw subtle grid
    ctx.strokeStyle = '#333333';
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

    // Draw strokes up to current index
    for (let i = 0; i <= currentStrokeIndex && i < sortedStrokes.length; i++) {
      drawStroke(ctx, sortedStrokes[i]);
    }
  }, [currentStrokeIndex, sortedStrokes, drawStroke]);

  // Auto-start animation when opened
  useEffect(() => {
    if (isOpen && sortedStrokes.length > 0) {
      setCurrentStrokeIndex(0);
      setIsReverse(false);
      setIsPlaying(true);
    }
  }, [isOpen, sortedStrokes.length]);

  // Animation loop
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
            // Reached end, switch to reverse or restart
            setIsReverse(true);
          }
        }
      }, Math.max(20, 100 / speed));

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
  }, [renderAnimation]);

  // Mouse/touch handlers for pan and zoom
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setInitialDistance(distance);
      setInitialZoom(zoom);
      return;
    }
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setLastMousePos({ x: clientX, y: clientY });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2 && initialDistance > 0) {
      // Two finger pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const zoomFactor = currentDistance / initialDistance;
      const newZoom = Math.max(0.05, Math.min(10, initialZoom * zoomFactor));
      setZoom(newZoom);
      return;
    }
    
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - lastMousePos.x;
    const deltaY = clientY - lastMousePos.y;
    
    setPanX(prev => prev - deltaX / zoom);
    setPanY(prev => prev - deltaY / zoom);
    
    setLastMousePos({ x: clientX, y: clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setInitialDistance(0);
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
    const newZoom = Math.max(0.05, Math.min(10, zoom * zoomFactor));
    
    // Keep the mouse position fixed during zoom
    setPanX(worldX - (mouseX - canvasSize / 2) / newZoom);
    setPanY(worldY - (mouseY - canvasSize / 2) / newZoom);
    setZoom(newZoom);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden animate-slide-in-right">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
            🎬 World Timelapse
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsHighscoreOpen(true)}
              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100/10"
            >
              <Trophy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="mb-4 relative">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="border border-border rounded bg-black cursor-move max-w-full touch-none"
            style={{ width: '100%', aspectRatio: '1', maxHeight: '70vh' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
          />
          
          {/* Progress bar */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-300"
              style={{ width: `${sortedStrokes.length > 0 ? ((currentStrokeIndex + 1) / sortedStrokes.length) * 100 : 0}%` }}
            />
          </div>
          
          {/* Info overlay */}
          <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-2 rounded text-sm">
            <div>Zoom: {Math.round(zoom * 100 / 0.08 * 100)}%</div>
            <div>{currentStrokeIndex + 1} / {sortedStrokes.length} strokes</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={sortedStrokes.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentStrokeIndex(0);
              setIsReverse(false);
              setIsPlaying(false);
            }}
          >
            ⏮️ Reset
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setZoom(0.08);
              setPanX(worldSize / 2);
              setPanY(worldSize / 2);
            }}
          >
            🌍 Fit All
          </Button>

          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <span className="text-xs px-2">Speed:</span>
            {[1, 2, 4, 8].map(speedValue => (
              <Button
                key={speedValue}
                size="sm"
                variant={speed === speedValue ? 'default' : 'ghost'}
                onClick={() => setSpeed(speedValue)}
                className="h-6 px-2 text-xs"
              >
                {speedValue}x
              </Button>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground text-center mt-3">
          🖱️ Scroll to zoom • Drag to pan • 📱 Pinch to zoom on mobile • Watch the world evolve stroke by stroke
        </div>

        {sortedStrokes.length === 0 && (
          <p className="text-center text-muted-foreground mt-4">
            No artwork yet. Once people start painting, you'll see the magic unfold! ✨
          </p>
        )}
      </div>

      {/* Highscore List Overlay */}
      <HighscoreList 
        isOpen={isHighscoreOpen}
        onClose={() => setIsHighscoreOpen(false)}
      />
    </div>
  );
};

export default TimeLapse;
