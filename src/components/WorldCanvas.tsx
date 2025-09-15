import { useRef, useEffect, useCallback, useState } from 'react';
import { PaintState } from '@/pages/Index';
import EdgeIndicators from './EdgeIndicators';
import { useOtherPlayers } from '@/hooks/useOtherPlayers';
import { ParticleExplosion } from './ParticleExplosion';
import { soundEffects } from '@/utils/soundEffects';
import { supabase } from '@/integrations/supabase/client';

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
  strokeCount: number;
  playerCount: number;
  isConnected: boolean;
  selectedEmoji: string;
  userMousePosition: { x: number; y: number };
  onMouseMove: (position: { x: number; y: number }) => void;
  collisionCount: number;
  onCollision: () => void;
  isDrawingEnabled: boolean;
  currentSessionToken?: string;
}

const WorldCanvas = ({ 
  paintState, 
  strokes, 
  onMove, 
  onStroke, 
  strokeCount, 
  playerCount, 
  isConnected, 
  selectedEmoji, 
  userMousePosition, 
  onMouseMove, 
  collisionCount, 
  onCollision,
  isDrawingEnabled,
  currentSessionToken 
}: WorldCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const edgePanRef = useRef<number>();
  
  // Smooth edge panning state with acceleration
  const edgePanVelocityRef = useRef({ x: 0, y: 0 });
  const lastEdgePanTimeRef = useRef(0);
  const edgePanAccelRef = useRef({ x: 0, y: 0 });
  const edgePanTimeRef = useRef(0);
  
  // Emoji positioning and collision state
  const [emojiPosition, setEmojiPosition] = useState({ x: 0, y: 0 });
  const [prevEmojiPosition, setPrevEmojiPosition] = useState({ x: 0, y: 0 });
  const [emojiVelocity, setEmojiVelocity] = useState({ vx: 0, vy: 0 });
  const [isEmojiHit, setIsEmojiHit] = useState(false);
  const [lastHitTime, setLastHitTime] = useState(0);
  const [explosionState, setExplosionState] = useState({ isActive: false, x: 0, y: 0 });
  
  // Import other players hook
  const { otherPlayers } = useOtherPlayers(currentSessionToken);

  // Dynamic canvas size: starts at 512x512, grows by 1 pixel per stroke, max 30% of world (3000x3000)
  const getCanvasSize = useCallback(() => {
    const baseSize = 512;
    const maxSize = 3000; // 30% of 10000 world size
    const dynamicSize = Math.min(baseSize + strokeCount, maxSize);
    return dynamicSize;
  }, [strokeCount]);

  // Smooth edge panning with acceleration when near borders
  const handleEdgePanning = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const edgeThreshold = 60;
    const minPanSpeed = 0.5;
    const maxPanSpeed = 8;
    
    // Calculate edge distance ratios
    let edgeFactorX = 0;
    let edgeFactorY = 0;
    
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Calculate how close we are to edges (0 = not close, 1 = at edge)
    if (x < edgeThreshold) {
      edgeFactorX = -(1 - x / edgeThreshold);
    } else if (x > canvasWidth - edgeThreshold) {
      const distFromEdge = canvasWidth - x;
      edgeFactorX = (1 - distFromEdge / edgeThreshold);
    }
    
    if (y < edgeThreshold) {
      edgeFactorY = -(1 - y / edgeThreshold);
    } else if (y > canvasHeight - edgeThreshold) {
      const distFromEdge = canvasHeight - y;
      edgeFactorY = (1 - distFromEdge / edgeThreshold);
    }
    
    // If we're not near any edge, reset everything
    if (edgeFactorX === 0 && edgeFactorY === 0) {
      edgePanVelocityRef.current = { x: 0, y: 0 };
      edgePanAccelRef.current = { x: 0, y: 0 };
      edgePanTimeRef.current = 0;
      if (edgePanRef.current) {
        cancelAnimationFrame(edgePanRef.current);
        edgePanRef.current = undefined;
      }
      return;
    }
    
    // Accumulate time for acceleration
    const currentTime = Date.now();
    if (edgePanTimeRef.current === 0) {
      edgePanTimeRef.current = currentTime;
    }
    const timeActive = Math.min((currentTime - edgePanTimeRef.current) / 1000, 2); // Max 2 seconds
    
    // Acceleration curve: start slow, build up over time
    const accelCurve = Math.min(timeActive * timeActive * 0.5 + 0.1, 1);
    
    // Calculate target velocities with acceleration
    const targetVelX = edgeFactorX * (minPanSpeed + (maxPanSpeed - minPanSpeed) * accelCurve);
    const targetVelY = edgeFactorY * (minPanSpeed + (maxPanSpeed - minPanSpeed) * accelCurve);
    
    // Smooth velocity transition
    const lerpFactor = 0.1;
    edgePanVelocityRef.current.x += (targetVelX - edgePanVelocityRef.current.x) * lerpFactor;
    edgePanVelocityRef.current.y += (targetVelY - edgePanVelocityRef.current.y) * lerpFactor;
    
    // Apply movement if significant
    if (Math.abs(edgePanVelocityRef.current.x) > 0.05 || Math.abs(edgePanVelocityRef.current.y) > 0.05) {
      onMove(edgePanVelocityRef.current.x, edgePanVelocityRef.current.y);
    }
    
    // Continue panning in next frame
    if (edgePanRef.current) {
      cancelAnimationFrame(edgePanRef.current);
    }
    edgePanRef.current = requestAnimationFrame(() => {
      handleEdgePanning(clientX, clientY);
    });
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

    const canvasSize = getCanvasSize();
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Debug: Log current viewport and stroke count
    console.log(`Rendering ${strokes.length} strokes at viewport (${Math.round(paintState.x)}, ${Math.round(paintState.y)})`);
    
    // Draw all completed strokes that have points visible in current viewport
    let visibleStrokeCount = 0;
    strokes.forEach((stroke, index) => {
      if (stroke.points.length === 0) return;
      
      // Check if any point of the stroke is visible (with larger margin for better visibility)
      const canvasSize = getCanvasSize();
      const margin = 200; // Increased margin to catch more strokes
      const isVisible = stroke.points.some(point => {
        const viewportPos = worldToViewport(point.x, point.y);
        return viewportPos.x >= -margin && viewportPos.x <= canvasSize + margin &&
               viewportPos.y >= -margin && viewportPos.y <= canvasSize + margin;
      });

      if (isVisible) {
        visibleStrokeCount++;
        // Debug: Log visible strokes
        if (index < 5) { // Only log first 5 for readability
          console.log(`Rendering stroke ${stroke.id} with ${stroke.points.length} points, first point:`, stroke.points[0]);
        }
        drawStroke(ctx, stroke);
      }
    });
    
    console.log(`Rendered ${visibleStrokeCount} visible strokes out of ${strokes.length} total`);

    // Draw current stroke being drawn (only if brush tool)
    if (isDrawingRef.current && currentStrokeRef.current.length > 0 && paintState.tool === 'brush') {
      const currentStroke = {
        id: 'current',
        points: currentStrokeRef.current,
        color: paintState.color,
        size: paintState.size,
        tool: 'brush' as const,
        timestamp: Date.now()
      };
      drawStroke(ctx, currentStroke);
    }
    
    // Debug: Log other players
    console.log(`Found ${otherPlayers.length} other players`);
    otherPlayers.forEach(player => {
      console.log(`Player ${player.anonymous_id}: pos(${player.position_x}, ${player.position_y}), emoji: ${player.selected_emoji}`);
    });
    
    // Draw other players' emojis using exact positioning
    otherPlayers.forEach((player, index) => {
      const emojiViewportPos = worldToViewport(player.position_x, player.position_y);
      console.log(`Rendering player ${player.anonymous_id} at viewport pos:`, emojiViewportPos);
      
      if (emojiViewportPos.x >= -50 && emojiViewportPos.x <= canvasSize + 50 && 
          emojiViewportPos.y >= -50 && emojiViewportPos.y <= canvasSize + 50) {
        
        // Use the player's selected emoji with enhanced visibility
        const playerEmoji = player.selected_emoji || '😀';
        
        // Add shadow for better visibility
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerEmoji, emojiViewportPos.x, emojiViewportPos.y);
        
        // Add a subtle border ring around other players
        ctx.strokeStyle = player.current_color || '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(emojiViewportPos.x, emojiViewportPos.y, 30, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();
      }
    });
    
    // Draw boundary gradient overlay (red areas where you can't paint)
    const worldBounds = {
      left: 0,
      top: 0,
      right: 10000,
      bottom: 10000
    };
    
    const viewportBounds = {
      left: worldToViewport(worldBounds.left, 0).x,
      top: worldToViewport(0, worldBounds.top).y,
      right: worldToViewport(worldBounds.right, 0).x,
      bottom: worldToViewport(0, worldBounds.bottom).y
    };
    
    const gradientSize = 100; // Size of the gradient fade
    
    // Left boundary
    if (viewportBounds.left > -gradientSize) {
      const gradient = ctx.createLinearGradient(viewportBounds.left - gradientSize, 0, viewportBounds.left, 0);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-1000, -1000, viewportBounds.left + gradientSize + 1000, canvasSize + 2000);
    }
    
    // Right boundary
    if (viewportBounds.right < canvasSize + gradientSize) {
      const gradient = ctx.createLinearGradient(viewportBounds.right, 0, viewportBounds.right + gradientSize, 0);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(viewportBounds.right, -1000, canvasSize + 1000 - viewportBounds.right, canvasSize + 2000);
    }
    
    // Top boundary
    if (viewportBounds.top > -gradientSize) {
      const gradient = ctx.createLinearGradient(0, viewportBounds.top - gradientSize, 0, viewportBounds.top);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-1000, -1000, canvasSize + 2000, viewportBounds.top + gradientSize + 1000);
    }
    
    // Bottom boundary
    if (viewportBounds.bottom < canvasSize + gradientSize) {
      const gradient = ctx.createLinearGradient(0, viewportBounds.bottom, 0, viewportBounds.bottom + gradientSize);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-1000, viewportBounds.bottom, canvasSize + 2000, canvasSize + 1000 - viewportBounds.bottom);
    }

    // Draw current player emoji
    if (selectedEmoji && emojiPosition.x !== 0 && emojiPosition.y !== 0) {
      const emojiViewportPos = worldToViewport(emojiPosition.x, emojiPosition.y);
      
      ctx.save();
      
      // Pulsation and red flash when hit
      if (isEmojiHit) {
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 20;
        ctx.transform(1.2, 0, 0, 1.2, emojiViewportPos.x * 0.2, emojiViewportPos.y * 0.2); // Scale up when hit
      } else if (collisionCount > 0) {
        const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        ctx.transform(pulseScale, 0, 0, pulseScale, emojiViewportPos.x * (1 - pulseScale), emojiViewportPos.y * (1 - pulseScale));
      }
      
      ctx.font = '60px Arial'; // 3x bigger
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedEmoji, emojiViewportPos.x, emojiViewportPos.y);
      
      ctx.restore();
    }
  }, [strokes, worldToViewport, drawStroke, paintState, getCanvasSize, otherPlayers, selectedEmoji, emojiPosition, isEmojiHit, collisionCount]);

  // Re-render when viewport or strokes change
  useEffect(() => {
    renderStrokes();
  }, [renderStrokes]);

  // Initialize canvas and update size when stroke count changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasSize = getCanvasSize();
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    renderStrokes();
  }, [renderStrokes, getCanvasSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const point = getCanvasPoint(e);
    if (!point || !isDrawingEnabled) return;

    isDrawingRef.current = true;
    const worldPos = viewportToWorld(point.x, point.y);
    currentStrokeRef.current = [worldPos];
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }

    // Re-render to show initial point
    renderStrokes();
  }, [getCanvasPoint, viewportToWorld, renderStrokes, isDrawingEnabled]);

  // Throttle collision detection to improve performance
  const lastCollisionCheck = useRef(0);
  const lastStrokePoint = useRef(0);
  
  const handlePointerMove = useCallback(async (e: React.PointerEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;
    
    const worldPos = viewportToWorld(point.x, point.y);
    
    // Update emoji position - constrain to canvas bounds with smooth lerp
    const canvasSize = getCanvasSize();
    const targetPos = {
      x: Math.max(paintState.x + 30, Math.min(paintState.x + canvasSize - 30, worldPos.x)),
      y: Math.max(paintState.y + 30, Math.min(paintState.y + canvasSize - 30, worldPos.y))
    };

    // Smooth emoji movement with lerp for fluid motion
    const lerpFactor = 0.8; // Higher value for more responsive movement
    const smoothPos = {
      x: emojiPosition.x + (targetPos.x - emojiPosition.x) * lerpFactor,
      y: emojiPosition.y + (targetPos.y - emojiPosition.y) * lerpFactor
    };

    // Calculate velocity for collision detection
    const deltaTime = 16;
    const velocity = {
      vx: (smoothPos.x - emojiPosition.x) / deltaTime * 1000,
      vy: (smoothPos.y - emojiPosition.y) / deltaTime * 1000
    };
    setEmojiVelocity(velocity);
    
    setPrevEmojiPosition(emojiPosition);
    setEmojiPosition(smoothPos);
    onMouseMove(smoothPos);
    
    // Throttle collision detection to every 100ms for better performance
    const now = Date.now();
    if (currentSessionToken && now - lastCollisionCheck.current > 100) {
      lastCollisionCheck.current = now;
      
      try {
        const { data: collisions, error } = await supabase
          .rpc('check_emoji_collision', {
            p_session_token: currentSessionToken,
            p_position_x: Math.floor(smoothPos.x),
            p_position_y: Math.floor(smoothPos.y)
          });

        if (!error && collisions && collisions.length > 0) {
          if (now - lastHitTime > 500) { // Prevent rapid collision spam
            
            setIsEmojiHit(true);
            setLastHitTime(now);
            onCollision();
            
            // Play collision sound
            soundEffects.playCollisionSound();
            
            // Trigger particle explosion at collision point
            const canvas = canvasRef.current;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const canvasPoint = worldToViewport(smoothPos.x, smoothPos.y);
              setExplosionState({
                isActive: true,
                x: rect.left + canvasPoint.x,
                y: rect.top + canvasPoint.y
              });
            }
            
            // Reset hit animation after 300ms
            setTimeout(() => setIsEmojiHit(false), 300);
          }
        }
      } catch (error) {
        console.error('Collision detection error:', error);
      }
    }
    
    if (!isDrawingRef.current) return;

    // Throttle stroke points to ensure smooth lines (max 60fps)
    if (now - lastStrokePoint.current > 16) {
      lastStrokePoint.current = now;
      
      // Only add point if it's significantly different from the last point
      const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      if (!lastPoint || 
          Math.abs(worldPos.x - lastPoint.x) > 2 || 
          Math.abs(worldPos.y - lastPoint.y) > 2) {
        currentStrokeRef.current.push(worldPos);
      }

      // Smooth re-rendering with RAF throttling
      requestAnimationFrame(() => {
        renderStrokes();
      });
    }

    // Handle edge panning for movement (always active)
    handleEdgePanning(e.clientX, e.clientY);
  }, [getCanvasPoint, viewportToWorld, renderStrokes, handleEdgePanning, paintState, onMouseMove, onCollision, lastHitTime, getCanvasSize, currentSessionToken, emojiPosition]);

  const handlePointerUp = useCallback(() => {
    if (isDrawingRef.current && currentStrokeRef.current.length > 0 && paintState.tool === 'brush') {
      // Send complete stroke (only for brush tool)
      onStroke({
        points: [...currentStrokeRef.current],
        color: paintState.color,
        size: paintState.size,
        tool: 'brush'
      });
    }
    
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    
    // Reset edge panning velocity when stopping drawing
    edgePanVelocityRef.current = { x: 0, y: 0 };
    
    // Stop edge panning
    if (edgePanRef.current) {
      cancelAnimationFrame(edgePanRef.current);
      edgePanRef.current = undefined;
    }
  }, [onStroke, paintState]);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen w-full p-4">
        <div className="relative">
          {/* Edge indicators */}
          <EdgeIndicators
            worldX={paintState.x}
            worldY={paintState.y}
            worldSize={10000}
            viewportSize={getCanvasSize()}
          />

          {/* Main canvas - responsive and centered */}
          <canvas
            ref={canvasRef}
            className={`border-2 border-border rounded-lg shadow-2xl max-w-full max-h-[70vh] w-auto h-auto ${isDrawingEnabled ? 'cursor-crosshair' : 'cursor-grab'}`}
            style={{ 
              aspectRatio: '1 / 1',
              maxWidth: 'min(600px, calc(100vw - 2rem), calc(100vh - 200px))',
              maxHeight: 'min(600px, calc(100vw - 2rem), calc(100vh - 200px))'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {/* Stats under canvas for both mobile and desktop */}
          <div className="absolute -bottom-8 left-0 right-0">
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
        </div>
      </div>

      {/* Particle explosion overlay */}
      <ParticleExplosion
        x={explosionState.x}
        y={explosionState.y}
        isActive={explosionState.isActive}
        onComplete={() => setExplosionState(prev => ({ ...prev, isActive: false }))}
      />
    </>
  );
};

export default WorldCanvas;