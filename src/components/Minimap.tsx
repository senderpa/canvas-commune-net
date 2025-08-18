import { useRef, useEffect, useCallback } from 'react';

interface MinimapProps {
  worldX: number;
  worldY: number;
  onJump: (x: number, y: number) => void;
}

const Minimap = ({ worldX, worldY, onJump }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 200;
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
    
    // TODO: Draw painted areas as dots/regions
    // For now, just show some example activity
    ctx.fillStyle = '#ff0080';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw current viewport
    const viewX = (worldX / worldSize) * size;
    const viewY = (worldY / worldSize) * size;
    const viewW = (viewportSize / worldSize) * size;
    const viewH = (viewportSize / worldSize) * size;
    
    ctx.strokeStyle = '#00ff80';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
    // Add glow effect
    ctx.shadowColor = '#00ff80';
    ctx.shadowBlur = 4;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    ctx.shadowBlur = 0;
    
  }, [worldX, worldY, size, worldSize, viewportSize]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert click position to world coordinates
    const newWorldX = Math.max(0, Math.min(worldSize - viewportSize, (clickX / size) * worldSize - viewportSize / 2));
    const newWorldY = Math.max(0, Math.min(worldSize - viewportSize, (clickY / size) * worldSize - viewportSize / 2));
    
    onJump(newWorldX, newWorldY);
  }, [size, worldSize, viewportSize, onJump]);

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <div className="text-xs text-muted-foreground mb-2 text-center">Minimap</div>
      <canvas
        ref={canvasRef}
        className="cursor-pointer border border-border rounded"
        style={{ width: `${size}px`, height: `${size}px` }}
        onClick={handleClick}
      />
      <div className="text-xs text-muted-foreground mt-2 text-center">
        Click to jump
      </div>
    </div>
  );
};

export default Minimap;