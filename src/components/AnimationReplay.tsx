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
  const animationRef = useRef<number>();

  const size = 400;
  const worldSize = 1000000;

  // Sort strokes by timestamp
  const sortedStrokes = [...strokes].sort((a, b) => a.timestamp - b.timestamp);

  // Draw stroke on canvas
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    // Convert world coordinates to canvas coordinates
    const canvasPoints = stroke.points.map(point => ({
      x: (point.x / worldSize) * size,
      y: (point.y / worldSize) * size
    }));

    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = Math.max(0.5, stroke.size / 15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (canvasPoints.length === 1) {
      // Single point
      const point = canvasPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.5, stroke.size / 20), 0, 2 * Math.PI);
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
  }, []);

  // Render animation up to current stroke
  const renderAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
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

    // Draw all strokes up to current index
    for (let i = 0; i <= currentStrokeIndex && i < sortedStrokes.length; i++) {
      drawStroke(ctx, sortedStrokes[i]);
    }
  }, [currentStrokeIndex, sortedStrokes, drawStroke]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg border border-border max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Drawing Evolution</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="mb-4">
          <canvas
            ref={canvasRef}
            className="border border-border rounded bg-white w-full"
            style={{ aspectRatio: '1' }}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
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
            
            <div className="flex-1 text-center text-sm text-muted-foreground">
              {currentStrokeIndex + 1} / {sortedStrokes.length} strokes
            </div>
          </div>

          <div className="flex items-center gap-2">
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