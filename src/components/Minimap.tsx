import { useRef, useEffect, useCallback } from 'react';

interface Stroke {
  x: number;
  y: number;
  color: string;
  size: number;
}

interface MinimapProps {
  worldX: number;
  worldY: number;
  strokes: Stroke[];
  onJump: (x: number, y: number) => void;
  onMove: (deltaX: number, deltaY: number) => void;
}

const Minimap = ({ worldX, worldY, strokes, onJump, onMove }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 300;
  const worldSize = 1000000;
  const viewportSize = 512;
  
  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = size;
    canvas.height = size;
    
    // Clear with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);
    
    // Draw grid
    ctx.strokeStyle = '#2d2d5f';
    ctx.lineWidth = 1;
    const gridSize = size / 10;
    for (let i = 0; i <= 10; i++) {
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
    
    // Draw all strokes as colored pixels across the entire world
    strokes.forEach(stroke => {
      // Convert world coordinates to minimap coordinates
      const x = (stroke.x / worldSize) * size;
      const y = (stroke.y / worldSize) * size;
      // Scale stroke size for minimap visibility (but keep it small)
      const pixelSize = Math.max(1, Math.min(3, Math.ceil(stroke.size / 10)));
      
      ctx.fillStyle = stroke.color;
      ctx.fillRect(Math.floor(x), Math.floor(y), pixelSize, pixelSize);
    });
    
    // Draw current viewport rectangle
    const viewX = (worldX / worldSize) * size;
    const viewY = (worldY / worldSize) * size;
    const viewW = (viewportSize / worldSize) * size;
    const viewH = (viewportSize / worldSize) * size;
    
    // Viewport outline with glow
    ctx.strokeStyle = '#00ff80';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff80';
    ctx.shadowBlur = 6;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    ctx.shadowBlur = 0;
    
    // Player position dot
    const playerX = viewX + viewW / 2;
    const playerY = viewY + viewH / 2;
    
    ctx.fillStyle = '#ff0080';
    ctx.shadowColor = '#ff0080';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    
  }, [worldX, worldY, strokes, size, worldSize, viewportSize]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert click position to world coordinates (center the viewport on click)
    const newWorldX = (clickX / size) * worldSize - viewportSize / 2;
    const newWorldY = (clickY / size) * worldSize - viewportSize / 2;
    
    onJump(newWorldX, newWorldY);
  }, [size, worldSize, viewportSize, onJump]);

  // Minimap navigation arrows
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
        className="absolute w-6 h-6 bg-card/80 border border-border rounded hover:bg-card transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={icons[direction as keyof typeof icons]} />
        </svg>
      </button>
    );
  };

  const moveSpeed = 50;

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl relative">
      <div className="text-xs text-muted-foreground mb-2 text-center">Minimap</div>
      
      {/* Navigation arrows */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <ArrowButton direction="up" onClick={() => onMove(0, -moveSpeed)} />
      </div>
      <div className="absolute top-1/2 left-2 -translate-y-1/2">
        <ArrowButton direction="left" onClick={() => onMove(-moveSpeed, 0)} />
      </div>
      <div className="absolute top-1/2 right-2 -translate-y-1/2">
        <ArrowButton direction="right" onClick={() => onMove(moveSpeed, 0)} />
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <ArrowButton direction="down" onClick={() => onMove(0, moveSpeed)} />
      </div>
      
      <canvas
        ref={canvasRef}
        className="cursor-pointer border border-border rounded"
        style={{ width: `${size}px`, height: `${size}px` }}
        onClick={handleClick}
      />
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        Click to jump • {strokes.length} total strokes
      </div>
    </div>
  );
};

export default Minimap;