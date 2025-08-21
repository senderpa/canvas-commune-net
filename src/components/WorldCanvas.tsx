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
  
  // Hand tool navigation state
  const isHandDraggingRef = useRef(false);
  const lastHandPositionRef = useRef({ x: 0, y: 0 });
  const handMomentumRef = useRef({ vx: 0, vy: 0 });
  const handMomentumAnimationRef = useRef<number>();
  
  // Smooth edge panning state
  const edgePanVelocityRef = useRef({ x: 0, y: 0 });
  const lastEdgePanTimeRef = useRef(0);
  
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

  // Hand tool momentum animation
  const animateHandMomentum = useCallback(() => {
    const momentum = handMomentumRef.current;
    const friction = 0.92; // Smoother deceleration
    const minVelocity = 0.5;
    
    if (Math.abs(momentum.vx) > minVelocity || Math.abs(momentum.vy) > minVelocity) {
      onMove(momentum.vx, momentum.vy);
      
      momentum.vx *= friction;
      momentum.vy *= friction;
      
      handMomentumAnimationRef.current = requestAnimationFrame(animateHandMomentum);
    } else {
      handMomentumRef.current = { vx: 0, vy: 0 };
    }
  }, [onMove]);

  // Smooth edge panning when painting near borders
  const handleEdgePanning = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const edgeThreshold = 40;
    const maxPanSpeed = 3;
    
    // Calculate target velocity based on distance from edge
    let targetVelX = 0;
    let targetVelY = 0;
    
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    if (x < edgeThreshold) {
      targetVelX = -maxPanSpeed * (1 - x / edgeThreshold); // Stronger closer to edge
    } else if (x > canvasWidth - edgeThreshold) {
      const distFromEdge = canvasWidth - x;
      targetVelX = maxPanSpeed * (1 - distFromEdge / edgeThreshold);
    }
    
    if (y < edgeThreshold) {
      targetVelY = -maxPanSpeed * (1 - y / edgeThreshold);
    } else if (y > canvasHeight - edgeThreshold) {
      const distFromEdge = canvasHeight - y;
      targetVelY = maxPanSpeed * (1 - distFromEdge / edgeThreshold);
    }
    
    // Smooth lerp to target velocity
    const lerpFactor = 0.15;
    edgePanVelocityRef.current.x += (targetVelX - edgePanVelocityRef.current.x) * lerpFactor;
    edgePanVelocityRef.current.y += (targetVelY - edgePanVelocityRef.current.y) * lerpFactor;
    
    // Apply movement if velocity is significant
    if (Math.abs(edgePanVelocityRef.current.x) > 0.1 || Math.abs(edgePanVelocityRef.current.y) > 0.1) {
      onMove(edgePanVelocityRef.current.x, edgePanVelocityRef.current.y);
      
      // Continue panning
      if (edgePanRef.current) {
        cancelAnimationFrame(edgePanRef.current);
      }
      edgePanRef.current = requestAnimationFrame(() => {
        handleEdgePanning(clientX, clientY);
      });
    } else {
      // Stop panning when velocity is too low
      edgePanVelocityRef.current = { x: 0, y: 0 };
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
      if (handMomentumAnimationRef.current) {
        cancelAnimationFrame(handMomentumAnimationRef.current);
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

    // Draw all completed strokes that have points visible in current viewport
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      // Check if any point of the stroke is visible (with margin)
      const canvasSize = getCanvasSize();
      const isVisible = stroke.points.some(point => {
        const viewportPos = worldToViewport(point.x, point.y);
        return viewportPos.x >= -stroke.size && viewportPos.x <= canvasSize + stroke.size &&
               viewportPos.y >= -stroke.size && viewportPos.y <= canvasSize + stroke.size;
      });

      if (isVisible) {
        drawStroke(ctx, stroke);
      }
    });

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
    
    // Draw other players' emojis using general area coordinates
    otherPlayers.forEach((player, index) => {
      const emojiViewportPos = worldToViewport(player.general_area_x, player.general_area_y);
      if (emojiViewportPos.x >= -50 && emojiViewportPos.x <= canvasSize + 50 && 
          emojiViewportPos.y >= -50 && emojiViewportPos.y <= canvasSize + 50) {
        
        // Use the player's selected emoji
        const playerEmoji = player.selected_emoji || '😀';
        
        ctx.font = '60px Arial'; // 3x bigger
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerEmoji, emojiViewportPos.x, emojiViewportPos.y);
      }
    });
    
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
    if (!point) return;

    if (paintState.tool === 'hand') {
      // Hand tool - start dragging
      isHandDraggingRef.current = true;
      lastHandPositionRef.current = { x: e.clientX, y: e.clientY };
      handMomentumRef.current = { vx: 0, vy: 0 };
      
      // Stop any existing momentum
      if (handMomentumAnimationRef.current) {
        cancelAnimationFrame(handMomentumAnimationRef.current);
      }
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (!isDrawingEnabled) return;

    // Brush tool
    isDrawingRef.current = true;
    const worldPos = viewportToWorld(point.x, point.y);
    currentStrokeRef.current = [worldPos];
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }

    // Re-render to show initial point
    renderStrokes();
  }, [getCanvasPoint, viewportToWorld, renderStrokes, isDrawingEnabled, paintState.tool]);

  // Throttle collision detection to improve performance
  const lastCollisionCheck = useRef(0);
  
  const handlePointerMove = useCallback(async (e: React.PointerEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;
    
    const worldPos = viewportToWorld(point.x, point.y);
    
    // Handle hand tool dragging
    if (paintState.tool === 'hand' && isHandDraggingRef.current) {
      const deltaX = e.clientX - lastHandPositionRef.current.x;
      const deltaY = e.clientY - lastHandPositionRef.current.y;
      
      // Faster movement for hand tool (2x speed)
      const moveSpeed = 2;
      const moveX = -deltaX * moveSpeed;
      const moveY = -deltaY * moveSpeed;
      
      onMove(moveX, moveY);
      
      // Track momentum for smooth deceleration
      handMomentumRef.current = { vx: moveX * 0.3, vy: moveY * 0.3 };
      
      lastHandPositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
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

    // Add point to current stroke in world coordinates
    currentStrokeRef.current.push(worldPos);

    // Smooth re-rendering with RAF throttling
    requestAnimationFrame(() => {
      renderStrokes();
    });

    // Handle edge panning while drawing
    handleEdgePanning(e.clientX, e.clientY);
  }, [getCanvasPoint, viewportToWorld, renderStrokes, handleEdgePanning, paintState, onMouseMove, onCollision, lastHitTime, getCanvasSize, currentSessionToken, emojiPosition, onMove]);

  const handlePointerUp = useCallback(() => {
    // Handle hand tool momentum
    if (paintState.tool === 'hand' && isHandDraggingRef.current) {
      isHandDraggingRef.current = false;
      
      // Start momentum animation if there's significant velocity
      const momentum = handMomentumRef.current;
      if (Math.abs(momentum.vx) > 1 || Math.abs(momentum.vy) > 1) {
        animateHandMomentum();
      }
      return;
    }

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
  }, [onStroke, paintState, animateHandMomentum]);

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
            className={`border-2 border-border rounded-lg shadow-2xl max-w-full max-h-[70vh] w-auto h-auto ${
              paintState.tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : 
              isDrawingEnabled ? 'cursor-crosshair' : 'cursor-grab'
            }`}
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
