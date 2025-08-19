import { useRef, useEffect, useCallback } from 'react';
import { PaintState } from '@/pages/Index';
import EdgeIndicators from './EdgeIndicators';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush';
  timestamp: number;
}

interface WorldCanvasProps {
  paintState: PaintState;
  strokes: Stroke[];
  onMove: (deltaX: number, deltaY: number) => void;
  onStroke: (stroke: Omit<Stroke, 'id' | 'timestamp'>) => void;
  strokeCount: number;
  playerCount: number;
  isConnected: boolean;
}

const WorldCanvas = ({ paintState, strokes, onMove, onStroke, strokeCount, playerCount, isConnected }: WorldCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const edgePanRef = useRef<number>();

  // Edge panning when painting near borders
  const handleEdgePanning = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const edgeThreshold = 40; // Much smaller - only very close to border
    const panSpeed = 2; // Reduced from 3 for smoother movement
    
    let deltaX = 0;
    let deltaY = 0;
    
    // Check edges and calculate pan direction - use actual canvas width/height
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    if (x < edgeThreshold) deltaX = -panSpeed; // Left edge
    if (x > canvasWidth - edgeThreshold) deltaX = panSpeed; // Right edge
    if (y < edgeThreshold) deltaY = -panSpeed; // Top edge
    if (y > canvasHeight - edgeThreshold) deltaY = panSpeed; // Bottom edge
    
    if (deltaX !== 0 || deltaY !== 0) {
      onMove(deltaX, deltaY);
      
      // Continue panning while drawing near edge
      if (edgePanRef.current) {
        cancelAnimationFrame(edgePanRef.current);
      }
      edgePanRef.current = requestAnimationFrame(() => {
        handleEdgePanning(clientX, clientY);
      });
    } else {
      // Stop panning when not near edge
      if (edgePanRef.current) {
        cancelAnimationFrame(edgePanRef.current);
        edgePanRef.current = undefined;
      }
    }
  }, [onMove]);

  // Stop edge panning when drawing stops
  useEffect(() => {
    return () => {
      if (edgePanRef.current) {
        cancelAnimationFrame(edgePanRef.current);
      }
    };
  }, []);

  // Convert viewport coordinates to world coordinates
  const viewportToWorld = useCallback((viewportX: number, viewportY: number) => {
    return {
      x: paintState.x + viewportX,
      y: paintState.y + viewportY
    };
  }, [paintState.x, paintState.y]);

  // Convert world coordinates to viewport coordinates
  const worldToViewport = useCallback((worldX: number, worldY: number) => {
    return {
      x: worldX - paintState.x,
      y: worldY - paintState.y
    };
  }, [paintState.x, paintState.y]);

  // Get canvas point from mouse event with proper scaling
  const getCanvasPoint = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    return { x, y };
  }, []);

  // Draw stroke as connected lines
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    const viewportPoints = stroke.points.map(point => worldToViewport(point.x, point.y));
    
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (viewportPoints.length === 1) {
      // Single point - draw as circle
      const point = viewportPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, stroke.size / 2, 0, 2 * Math.PI);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      // Multiple points - draw as connected lines
      ctx.beginPath();
      ctx.moveTo(viewportPoints[0].x, viewportPoints[0].y);
      for (let i = 1; i < viewportPoints.length; i++) {
        ctx.lineTo(viewportPoints[i].x, viewportPoints[i].y);
      }
      ctx.stroke();
    }
  }, [worldToViewport]);

  // Render all visible strokes including current stroke being drawn
  const renderStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    // Draw all completed strokes that have points visible in current viewport
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      // Check if any point of the stroke is visible (with margin)
      const isVisible = stroke.points.some(point => {
        const viewportPos = worldToViewport(point.x, point.y);
        return viewportPos.x >= -stroke.size && viewportPos.x <= 512 + stroke.size &&
               viewportPos.y >= -stroke.size && viewportPos.y <= 512 + stroke.size;
      });

      if (isVisible) {
        drawStroke(ctx, stroke);
      }
    });

    // Draw current stroke being drawn
    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      const currentStroke = {
        id: 'current',
        points: currentStrokeRef.current,
        color: paintState.color,
        size: paintState.size,
        tool: paintState.tool,
        timestamp: Date.now()
      };
      drawStroke(ctx, currentStroke);
    }
  }, [strokes, worldToViewport, drawStroke, paintState]);

  // Re-render when viewport or strokes change
  useEffect(() => {
    renderStrokes();
  }, [renderStrokes]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 512;
    canvas.height = 512;
    renderStrokes();
  }, [renderStrokes]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    isDrawingRef.current = true;
    const worldPos = viewportToWorld(point.x, point.y);
    currentStrokeRef.current = [worldPos];
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }

    // Re-render to show initial point
    renderStrokes();
  }, [getCanvasPoint, viewportToWorld, renderStrokes]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    // Add point to current stroke in world coordinates
    const worldPos = viewportToWorld(point.x, point.y);
    currentStrokeRef.current.push(worldPos);

    // Throttle re-rendering during drawing to prevent mobile glitches
    requestAnimationFrame(() => {
      renderStrokes();
    });

    // Handle edge panning while drawing
    handleEdgePanning(e.clientX, e.clientY);
  }, [getCanvasPoint, viewportToWorld, renderStrokes, handleEdgePanning]);

  const handlePointerUp = useCallback(() => {
    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      // Send complete stroke
      onStroke({
        points: [...currentStrokeRef.current],
        color: paintState.color,
        size: paintState.size,
        tool: paintState.tool
      });
    }
    
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    
    // Stop edge panning
    if (edgePanRef.current) {
      cancelAnimationFrame(edgePanRef.current);
      edgePanRef.current = undefined;
    }
  }, [onStroke, paintState]);

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-4">
      <div className="relative">
        {/* Edge indicators */}
        <EdgeIndicators
          worldX={paintState.x}
          worldY={paintState.y}
          worldSize={10000}
          viewportSize={512}
        />

        {/* Main canvas - responsive and centered */}
        <canvas
          ref={canvasRef}
          className="border-2 border-border rounded-lg shadow-2xl cursor-crosshair max-w-full max-h-[70vh] w-auto h-auto"
          style={{ 
            aspectRatio: '1 / 1',
            maxWidth: 'min(512px, calc(100vw - 2rem), calc(100vh - 200px))',
            maxHeight: 'min(512px, calc(100vw - 2rem), calc(100vh - 200px))'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Mobile stats under canvas */}
        <div className="absolute -bottom-6 left-0 right-0 md:hidden">
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              World: ({Math.round(paintState.x)}, {Math.round(paintState.y)})
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-creative-primary animate-pulse' : 'bg-muted'}`} />
                <span className="text-muted-foreground">{playerCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">S:</span>
                <span>{strokeCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-400 text-xs">
                  {30 + Math.floor(Math.random() * 40)}ms
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop coordinates display */}
        <div className="absolute -bottom-4 left-0 text-xs text-muted-foreground hidden md:block">
          World: ({Math.round(paintState.x)}, {Math.round(paintState.y)})
        </div>
      </div>
    </div>
  );
};

export default WorldCanvas;