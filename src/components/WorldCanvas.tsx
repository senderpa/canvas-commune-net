import { useRef, useEffect, useCallback } from 'react';
import { PaintState } from '@/pages/Index';

interface Stroke {
  x: number;
  y: number;
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
}

interface WorldCanvasProps {
  paintState: PaintState;
  strokes: Stroke[];
  onMove: (deltaX: number, deltaY: number) => void;
  onStroke: (worldX: number, worldY: number, color: string, size: number, tool: 'brush' | 'eraser') => void;
}

const WorldCanvas = ({ paintState, strokes, onMove, onStroke }: WorldCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const moveSpeed = 20;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onMove(0, -moveSpeed);
          break;
        case 'ArrowDown':
          e.preventDefault();
          onMove(0, moveSpeed);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onMove(-moveSpeed, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onMove(moveSpeed, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove]);

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

  // Get canvas point from mouse event
  const getCanvasPoint = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return { x, y };
  }, []);

  // Draw line between two points
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: {x: number, y: number}, to: {x: number, y: number}, color: string, size: number, tool: 'brush' | 'eraser') => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  // Render all visible strokes
  const renderStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    // Draw all strokes that are visible in current viewport
    strokes.forEach(stroke => {
      const viewportPos = worldToViewport(stroke.x, stroke.y);
      
      // Only draw if stroke is visible in viewport (with some margin)
      if (viewportPos.x >= -stroke.size && viewportPos.x <= 512 + stroke.size &&
          viewportPos.y >= -stroke.size && viewportPos.y <= 512 + stroke.size) {
        
        ctx.beginPath();
        ctx.arc(viewportPos.x, viewportPos.y, stroke.size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.fill();
      }
    });
  }, [strokes, worldToViewport]);

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
    lastPointRef.current = point;
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }

    // Convert to world coordinates and add stroke
    const worldPos = viewportToWorld(point.x, point.y);
    onStroke(worldPos.x, worldPos.y, paintState.color, paintState.size, paintState.tool);

    // Draw immediately on canvas
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, paintState.size / 2, 0, 2 * Math.PI);
      ctx.fillStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
      ctx.fill();
    }
  }, [getCanvasPoint, viewportToWorld, onStroke, paintState]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Draw line from last point to current point
    drawLine(ctx, lastPointRef.current, point, paintState.color, paintState.size, paintState.tool);

    // Convert to world coordinates and add stroke
    const worldPos = viewportToWorld(point.x, point.y);
    onStroke(worldPos.x, worldPos.y, paintState.color, paintState.size, paintState.tool);

    lastPointRef.current = point;
  }, [getCanvasPoint, drawLine, paintState, viewportToWorld, onStroke]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  // Navigation arrows around canvas
  const ArrowButton = ({ direction, onClick }: { direction: string; onClick: () => void }) => {
    const icons = {
      up: "M5 15l7-7 7 7",
      down: "M19 9l-7 7-7-7", 
      left: "M15 19l-7-7 7-7",
      right: "M9 5l7 7-7 7"
    };

    return (
      <button
        onClick={onClick}
        className="absolute w-10 h-10 bg-card/80 border border-border rounded-lg hover:bg-card transition-all duration-200 flex items-center justify-center shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[direction as keyof typeof icons]} />
        </svg>
      </button>
    );
  };

  const moveSpeed = 50;

  return (
    <div className="relative">
      {/* Navigation arrows around canvas */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2">
        <ArrowButton direction="up" onClick={() => onMove(0, -moveSpeed)} />
      </div>
      <div className="absolute top-1/2 -left-14 -translate-y-1/2">
        <ArrowButton direction="left" onClick={() => onMove(-moveSpeed, 0)} />
      </div>
      <div className="absolute top-1/2 -right-14 -translate-y-1/2">
        <ArrowButton direction="right" onClick={() => onMove(moveSpeed, 0)} />
      </div>
      <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
        <ArrowButton direction="down" onClick={() => onMove(0, moveSpeed)} />
      </div>

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="border-2 border-border rounded-lg shadow-2xl cursor-crosshair"
        style={{ width: '512px', height: '512px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Coordinates display */}
      <div className="absolute -bottom-8 left-0 text-xs text-muted-foreground">
        World: ({Math.round(paintState.x)}, {Math.round(paintState.y)})
      </div>
    </div>
  );
};

export default WorldCanvas;