import { useRef, useEffect, useCallback, useState } from 'react';
import { PaintState } from '@/pages/Index';
import EdgeIndicators from './EdgeIndicators';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface WorldCanvasProps {
  paintState: PaintState;
  strokes: Stroke[];
  onMove: (deltaX: number, deltaY: number) => void;
  onStroke: (stroke: Omit<Stroke, 'id' | 'timestamp'>) => void;
}

const WorldCanvas = ({ paintState, strokes, onMove, onStroke }: WorldCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const keyTimesRef = useRef<Map<string, number>>(new Map());
  const animationRef = useRef<number>();

  // Continuous keyboard movement with acceleration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (!keysRef.current.has(e.key)) {
          keysRef.current.add(e.key);
          keyTimesRef.current.set(e.key, Date.now());
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
      keyTimesRef.current.delete(e.key);
    };

    const updateMovement = () => {
      let deltaX = 0;
      let deltaY = 0;
      const currentTime = Date.now();

      keysRef.current.forEach(key => {
        const startTime = keyTimesRef.current.get(key) || currentTime;
        const holdDuration = (currentTime - startTime) / 1000; // seconds
        
        // Calculate speed based on hold duration - 3x faster
        // 0-10s: slow (3-9x), 10-30s: medium (9-24x), 30s+: fast (24x)
        let speed;
        if (holdDuration < 10) {
          speed = 3 + (holdDuration / 10) * 6; // 3 to 9
        } else if (holdDuration < 30) {
          speed = 9 + ((holdDuration - 10) / 20) * 15; // 9 to 24
        } else {
          speed = 24; // max speed
        }

        switch (key) {
          case 'ArrowUp':
            deltaY -= speed;
            break;
          case 'ArrowDown':
            deltaY += speed;
            break;
          case 'ArrowLeft':
            deltaX -= speed;
            break;
          case 'ArrowRight':
            deltaX += speed;
            break;
        }
      });

      if (deltaX !== 0 || deltaY !== 0) {
        onMove(deltaX, deltaY);
      }

      animationRef.current = requestAnimationFrame(updateMovement);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animationRef.current = requestAnimationFrame(updateMovement);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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

  // Draw stroke as connected lines
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    const viewportPoints = stroke.points.map(point => worldToViewport(point.x, point.y));
    
    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (viewportPoints.length === 1) {
      // Single point - draw as circle
      const point = viewportPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, stroke.size / 2, 0, 2 * Math.PI);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      // Multiple points - draw as connected lines
      ctx.moveTo(viewportPoints[0].x, viewportPoints[0].y);
      for (let i = 1; i < viewportPoints.length; i++) {
        ctx.lineTo(viewportPoints[i].x, viewportPoints[i].y);
      }
      ctx.stroke();
    }
  }, [worldToViewport]);

  // Render all visible strokes
  const renderStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    // Draw all strokes that have points visible in current viewport
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
  }, [strokes, worldToViewport, drawStroke]);

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

    // Draw immediately on canvas
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, paintState.size / 2, 0, 2 * Math.PI);
      ctx.fillStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
      ctx.fill();
    }
  }, [getCanvasPoint, viewportToWorld, paintState]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Add point to current stroke
    const worldPos = viewportToWorld(point.x, point.y);
    currentStrokeRef.current.push(worldPos);

    // Draw line to canvas
    const prevPoint = currentStrokeRef.current[currentStrokeRef.current.length - 2];
    if (prevPoint) {
      const prevViewport = worldToViewport(prevPoint.x, prevPoint.y);
      ctx.beginPath();
      ctx.moveTo(prevViewport.x, prevViewport.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
      ctx.lineWidth = paintState.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }, [getCanvasPoint, viewportToWorld, worldToViewport, paintState]);

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
  }, [onStroke, paintState]);

  return (
    <div className="relative">
      {/* Edge indicators */}
      <EdgeIndicators
        worldX={paintState.x}
        worldY={paintState.y}
        worldSize={1000000}
        viewportSize={512}
      />

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