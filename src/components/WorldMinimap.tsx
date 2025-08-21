import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOtherPlayers } from '@/hooks/useOtherPlayers';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface WorldMinimapProps {
  worldX: number;
  worldY: number;
  lastStrokeX: number;
  lastStrokeY: number;
  strokes: Stroke[];
  currentSessionToken?: string;
  selectedEmoji: string;
  onClose: () => void;
}

const WorldMinimap = ({ worldX, worldY, lastStrokeX, lastStrokeY, strokes, currentSessionToken, selectedEmoji, onClose }: WorldMinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(0.06); // Show full world (10000 pixels in 600px canvas = 0.06)
  const [panX, setPanX] = useState(5000); // Center of world (10000/2)
  const [panY, setPanY] = useState(5000); // Center of world (10000/2)
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(true);
  
  // Animation state
  const animationRef = useRef<number>();
  const startValuesRef = useRef({ zoom: 0.06, panX: 5000, panY: 5000 });
  const targetValuesRef = useRef({ zoom: 0.06, panX: 5000, panY: 5000 });
  const animationStartTimeRef = useRef(0);
  
  // Get other players' positions
  const { otherPlayers } = useOtherPlayers(currentSessionToken);

  const worldSize = 10000;
  const minimapSize = 600;

  // Blinking animation for player position - higher frequency when actively painting
  const [isActivelyPainting, setIsActivelyPainting] = useState(false);
  
  // Smooth fly-in animation function
  const animateToTarget = useCallback((targetZoom: number, targetPanX: number, targetPanY: number) => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Store start values
    startValuesRef.current = { zoom, panX, panY };
    targetValuesRef.current = { zoom: targetZoom, panX: targetPanX, panY: targetPanY };
    animationStartTimeRef.current = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - animationStartTimeRef.current;
      const duration = 800; // 800ms animation
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const startVals = startValuesRef.current;
      const targetVals = targetValuesRef.current;
      
      setZoom(startVals.zoom + (targetVals.zoom - startVals.zoom) * easeOut);
      setPanX(startVals.panX + (targetVals.panX - startVals.panX) * easeOut);
      setPanY(startVals.panY + (targetVals.panY - startVals.panY) * easeOut);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [zoom, panX, panY]);
  
  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    // Check if player moved recently (indicating active painting)
    const now = Date.now();
    const timeSinceLastStroke = now - (strokes[strokes.length - 1]?.timestamp || 0);
    setIsActivelyPainting(timeSinceLastStroke < 3000); // Active if stroked within last 3 seconds
    
    const blinkSpeed = isActivelyPainting ? 200 : 600; // Faster blink when painting
    const interval = setInterval(() => {
      setIsBlinking(prev => !prev);
    }, blinkSpeed);
    return () => clearInterval(interval);
  }, [strokes, isActivelyPainting]);

  // Draw a single stroke on the minimap
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    // Convert world coordinates to canvas coordinates
    const canvasPoints = stroke.points.map(point => ({
      x: ((point.x - panX) * zoom) + minimapSize / 2,
      y: ((point.y - panY) * zoom) + minimapSize / 2
    }));

    // Check if stroke is visible
    const isVisible = canvasPoints.some(point => 
      point.x >= -10 && point.x <= minimapSize + 10 &&
      point.y >= -10 && point.y <= minimapSize + 10
    );

    if (!isVisible) return;

    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = Math.max(0.1, stroke.size * zoom * 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (canvasPoints.length === 1) {
      // Single point
      const point = canvasPoints[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.1, stroke.size * zoom), 0, 2 * Math.PI);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      // Multiple points - draw connected path
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      ctx.stroke();
    }
  }, [zoom, panX, panY, minimapSize]);

  // Render the complete minimap
  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, minimapSize, minimapSize);

    // Draw world boundary if zoomed out enough
    if (zoom < 0.5) {
      const boundaryX = ((0 - panX) * zoom) + minimapSize / 2;
      const boundaryY = ((0 - panY) * zoom) + minimapSize / 2;
      const boundaryWidth = worldSize * zoom;
      const boundaryHeight = worldSize * zoom;

      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(boundaryX, boundaryY, boundaryWidth, boundaryHeight);
    }

    // Draw grid if zoomed in enough
    if (zoom > 0.1) {
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 0.5;
      
      const gridSpacing = Math.max(50, 100 / zoom);
      const startX = Math.floor(panX / gridSpacing) * gridSpacing;
      const startY = Math.floor(panY / gridSpacing) * gridSpacing;
      
      for (let x = startX - gridSpacing * 5; x <= startX + gridSpacing * 5; x += gridSpacing) {
        const canvasX = ((x - panX) * zoom) + minimapSize / 2;
        if (canvasX >= 0 && canvasX <= minimapSize) {
          ctx.beginPath();
          ctx.moveTo(canvasX, 0);
          ctx.lineTo(canvasX, minimapSize);
          ctx.stroke();
        }
      }
      
      for (let y = startY - gridSpacing * 5; y <= startY + gridSpacing * 5; y += gridSpacing) {
        const canvasY = ((y - panY) * zoom) + minimapSize / 2;
        if (canvasY >= 0 && canvasY <= minimapSize) {
          ctx.beginPath();
          ctx.moveTo(0, canvasY);
          ctx.lineTo(minimapSize, canvasY);
          ctx.stroke();
        }
      }
    }

    // Draw all strokes
    strokes.forEach(stroke => drawStroke(ctx, stroke));

    // Draw other players with their emojis and current positions
    otherPlayers.forEach((player, index) => {
      const playerX = ((player.position_x - panX) * zoom) + minimapSize / 2;
      const playerY = ((player.position_y - panY) * zoom) + minimapSize / 2;
      
      // Only draw if within canvas bounds (with some buffer)
      if (playerX >= -20 && playerX <= minimapSize + 20 && playerY >= -20 && playerY <= minimapSize + 20) {
        // Generate consistent random color for each player based on their anonymous ID
        const colors = [
          '#ff4757', '#2ed573', '#3742fa', '#ff6348', '#7bed9f', 
          '#70a1ff', '#5352ed', '#ff3838', '#2f3542', '#f1c40f',
          '#9c88ff', '#ffa726', '#26de81', '#45aaf2', '#fd79a8',
          '#00cec9', '#6c5ce7', '#a29bfe', '#fab1a0', '#00b894'
        ];
        const playerColor = colors[player.anonymous_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length];
        
        // Draw player dot with random color
        ctx.beginPath();
        ctx.arc(playerX, playerY, Math.max(3, 5 * zoom), 0, 2 * Math.PI);
        ctx.fillStyle = playerColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.5, 2 * zoom);
        ctx.stroke();
        
        // Draw player emoji instead of tool indicator
        ctx.fillStyle = '#000000';
        ctx.font = `${Math.max(12, 18 * zoom)}px Arial`; // 3x bigger emojis
        ctx.textAlign = 'center';
        
        // Use the player's selected emoji
        const playerEmoji = player.selected_emoji || '😀';
        
        ctx.fillText(playerEmoji, playerX, playerY);
      }
    });

    // Draw current player emoji instead of dot - show where last stroke ended
    const playerCanvasX = ((lastStrokeX - panX) * zoom) + minimapSize / 2;
    const playerCanvasY = ((lastStrokeY - panY) * zoom) + minimapSize / 2;

    // Draw player emoji with blinking effect
    ctx.save();
    if (isBlinking) {
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = Math.max(2, 10 * zoom);
    } else {
      ctx.globalAlpha = 0.8;
    }
    
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.max(12, 18 * zoom)}px Arial`; // 3x bigger
    ctx.textAlign = 'center';
    ctx.fillText(selectedEmoji, playerCanvasX, playerCanvasY);
    ctx.restore();
  }, [strokes, worldX, worldY, lastStrokeX, lastStrokeY, drawStroke, zoom, panX, panY, minimapSize, isBlinking, otherPlayers, selectedEmoji]);

  // Update canvas when anything changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = minimapSize;
    canvas.height = minimapSize;
    renderMinimap();
  }, [renderMinimap, minimapSize]);

  // Mouse handlers for expanded mode
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
    
    const worldMouseX = panX + (mouseX - minimapSize / 2) / zoom;
    const worldMouseY = panY + (mouseY - minimapSize / 2) / zoom;
    
    const zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
    const newZoom = Math.max(0.017, Math.min(10, zoom * zoomFactor)); // Allow zoom out to 1:17 (0.06/3.5 ≈ 0.017)
    
    setPanX(worldMouseX - (mouseX - minimapSize / 2) / newZoom);
    setPanY(worldMouseY - (mouseY - minimapSize / 2) / newZoom);
    setZoom(newZoom);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Complete World Map</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                animateToTarget(0.06, worldSize / 2, worldSize / 2);
              }}
            >
              Fit World
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                animateToTarget(2, lastStrokeX, lastStrokeY);
              }}
            >
              Go to Me
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        <div className="relative p-4">
          <canvas
            ref={canvasRef}
            width={minimapSize}
            height={minimapSize}
            className="border border-border rounded bg-white cursor-move w-full max-w-full"
            style={{ aspectRatio: '1', maxHeight: '60vh' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          
          <div className="absolute top-6 right-6 bg-black/50 text-white px-2 py-1 rounded text-sm">
            Scale: {zoom < 1 ? `1:${Math.round(1/zoom)}` : `${Math.round(zoom)}:1`}
          </div>
          <div className="absolute bottom-6 left-6 bg-black/50 text-white px-2 py-1 rounded text-xs">
            Center: ({Math.round(panX)}, {Math.round(panY)})
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMinimap;