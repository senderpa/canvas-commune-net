import { useRef, useEffect, useCallback } from 'react';

interface Stroke {
  x: number;
  y: number;
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
}

interface MinimapProps {
  worldX: number;
  worldY: number;
  strokes: Stroke[];
  onJump: (x: number, y: number) => void;
}

const Minimap = ({ worldX, worldY, strokes, onJump }: MinimapProps) => {
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
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Draw light grid
    ctx.strokeStyle = '#e0e0e0';
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
    
    // Draw all strokes as colored pixels across the entire world
    strokes.forEach(stroke => {
      // Convert world coordinates to minimap coordinates
      const x = (stroke.x / worldSize) * size;
      const y = (stroke.y / worldSize) * size;
      
      // Only draw if within bounds
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const pixelSize = Math.max(1, Math.min(2, Math.ceil(stroke.size / 15)));
        
        ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.fillRect(Math.floor(x), Math.floor(y), pixelSize, pixelSize);
      }
    });
    
    // Draw current viewport rectangle
    const viewX = (worldX / worldSize) * size;
    const viewY = (worldY / worldSize) * size;
    const viewW = (viewportSize / worldSize) * size;
    const viewH = (viewportSize / worldSize) * size;
    
    // Viewport outline
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
    // Player position dot
    const playerX = viewX + viewW / 2;
    const playerY = viewY + viewH / 2;
    
    ctx.fillStyle = '#ff0080';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
  }, [worldX, worldY, strokes]);

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
  }, [onJump]);

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <div className="text-xs text-muted-foreground mb-2 text-center">World Map</div>
      
      <canvas
        ref={canvasRef}
        className="cursor-pointer border border-border rounded bg-white"
        style={{ width: `${size}px`, height: `${size}px` }}
        onClick={handleClick}
      />
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        Click to jump • {strokes.length} strokes
      </div>
    </div>
  );
};

export default Minimap;