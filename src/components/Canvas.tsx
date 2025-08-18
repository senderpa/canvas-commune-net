import { useRef, useEffect, useCallback, useState } from 'react';
import { PaintState } from '@/pages/Index';

interface CanvasProps {
  paintState: PaintState;
  onMove: (deltaX: number, deltaY: number) => void;
}

const Canvas = ({ paintState, onMove }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Handle keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const moveSpeed = 20; // pixels per press
      
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

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
    ctx.lineWidth = paintState.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (paintState.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = paintState.color;
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [paintState]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (point) {
      setLastPoint(point);
      
      // Draw initial dot
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawLine(ctx, point, point);
      }
    }
  }, [getCanvasPoint, drawLine]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPoint) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (point) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawLine(ctx, lastPoint, point);
        setLastPoint(point);
      }
    }
  }, [isDrawing, lastPoint, getCanvasPoint, drawLine]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 512;
    canvas.height = 512;

    // Clear with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
  }, []);

  return (
    <div className="relative">
      {/* World coordinates display */}
      <div className="absolute -top-8 left-0 text-xs text-muted-foreground">
        World: {paintState.x.toLocaleString()}, {paintState.y.toLocaleString()}
      </div>
      
      <canvas
        ref={canvasRef}
        className="border-2 border-canvas-border bg-white cursor-crosshair rounded-lg shadow-2xl"
        style={{
          width: '512px',
          height: '512px',
          touchAction: 'none' // Prevent default touch behaviors
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
};

export default Canvas;