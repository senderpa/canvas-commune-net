import { useState, useCallback, useEffect } from 'react';
import WorldCanvas from '@/components/WorldCanvas';
import ColorPicker from '@/components/ColorPicker';
import ToolBar from '@/components/ToolBar';
import PlayerStats from '@/components/PlayerStats';
import InfoDialog from '@/components/InfoDialog';
import AnimationReplay from '@/components/AnimationReplay';
import WorldMinimap from '@/components/WorldMinimap';
import MobileOverlay from '@/components/MobileOverlay';
import QueueOverlay from '@/components/QueueOverlay';
import KickedOverlay from '@/components/KickedOverlay';
import { LivePreview } from '@/components/LivePreview';
import TimeLapse from '@/components/TimeLapse';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlayerSession } from '@/hooks/usePlayerSession';
import { useRealTimeStrokes } from '@/hooks/useRealTimeStrokes';
import { useSessionStrokeCount } from '@/hooks/useSessionStrokeCount';

export type Tool = 'brush';

export interface PaintState {
  color: string;
  tool: Tool;
  size: number;
  x: number; // Current viewport position in world coordinates
  y: number;
}

const Index = () => {
  const isMobile = useIsMobile();
  const { sessionState, joinSession, leaveSession, updateActivity, updatePosition, updatePaintState, resetKick } = usePlayerSession();
  const { strokes, isLoading: strokesLoading, addStroke } = useRealTimeStrokes();
  const { sessionStrokeCount, incrementStrokeCount, resetStrokeCount } = useSessionStrokeCount(sessionState.playerId, sessionState.isConnected);
  
  // Generate random starting position and color (updated)
  const [initialPosition] = useState(() => ({
    x: Math.floor(Math.random() * (10000 - 512)),
    y: Math.floor(Math.random() * (10000 - 512))
  }));
  
  const [paintState, setPaintState] = useState<PaintState>({
    color: '#ff0080', // Will be overridden by useEffect
    tool: 'brush',
    size: 3,
    ...initialPosition
  });
  
  const [isStarted, setIsStarted] = useState(false);
  
  // Generate new random color on each session start
  useEffect(() => {
    if (isStarted && sessionState.isConnected) {
      const colors = ['#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff', '#ff0040', '#40ff00', '#0040ff', '#ff3366', '#33ff66', '#3366ff', '#ff6b35', '#7b68ee', '#ff1493', '#00bfff', '#32cd32'];
      const newColor = colors[Math.floor(Math.random() * colors.length)];
      setPaintState(prev => ({ ...prev, color: newColor }));
      console.log('Random color generated on session start:', newColor);
    }
  }, [isStarted, sessionState.isConnected]);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPlayOpen, setIsPlayOpen] = useState(false);
  const [isTimeLapseOpen, setIsTimeLapseOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState(initialPosition);
  const [lastStrokePosition, setLastStrokePosition] = useState(initialPosition);
  
  const handleColorChange = useCallback((color: string) => {
    setPaintState(prev => ({ ...prev, color }));
    updatePaintState(color, undefined, undefined);
  }, [updatePaintState]);
  
  const handleToolChange = useCallback((tool: Tool) => {
    setPaintState(prev => ({ ...prev, tool }));
    updatePaintState(undefined, tool, undefined);
  }, [updatePaintState]);
  
  const handleSizeChange = useCallback((size: number) => {
    setPaintState(prev => ({ ...prev, size }));
    updatePaintState(undefined, undefined, size);
  }, [updatePaintState]);
  
  const handleMove = useCallback((deltaX: number, deltaY: number) => {
    setTargetPosition(prev => {
      const newPos = {
        x: Math.max(0, Math.min(10000 - 512, prev.x + deltaX)),
        y: Math.max(0, Math.min(10000 - 512, prev.y + deltaY))
      };
      
      // Update position in database
      updatePosition(newPos.x, newPos.y);
      
      return newPos;
    });
  }, [updatePosition]);

  const handleStroke = useCallback(async (stroke: {
    points: { x: number; y: number }[];
    color: string;
    size: number;
    tool: 'brush';
  }) => {
    // Ensure all stroke points are within world bounds
    const validPoints = stroke.points.filter(point => 
      point.x >= 0 && point.x < 10000 && point.y >= 0 && point.y < 10000
    );
    
    if (validPoints.length > 0 && sessionState.playerId) {
      // Track the last stroke position (end of last stroke)
      const lastPoint = validPoints[validPoints.length - 1];
      setLastStrokePosition({ x: lastPoint.x, y: lastPoint.y });
      
      // Calculate world position for the stroke (center point)
      const avgX = validPoints.reduce((sum, p) => sum + p.x, 0) / validPoints.length;
      const avgY = validPoints.reduce((sum, p) => sum + p.y, 0) / validPoints.length;
      
      await addStroke({
        player_id: sessionState.playerId,
        points: validPoints,
        color: stroke.color,
        size: stroke.size,
        tool: stroke.tool,
        world_x: Math.floor(avgX),
        world_y: Math.floor(avgY)
      });
      
      // Increment session stroke count
      incrementStrokeCount();
      
      // Update activity when painting
      updateActivity();
    }
  }, [addStroke, updateActivity, sessionState.playerId, incrementStrokeCount]);

  // Smooth lerp movement
  useEffect(() => {
    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    let animationFrame: number;
    
    const updatePosition = () => {
      setPaintState(prev => {
        const lerpFactor = 0.1; // Smooth movement speed
        const newX = lerp(prev.x, targetPosition.x, lerpFactor);
        const newY = lerp(prev.y, targetPosition.y, lerpFactor);
        
        // Continue animation if not close enough
        if (Math.abs(newX - targetPosition.x) > 1 || Math.abs(newY - targetPosition.y) > 1) {
          animationFrame = requestAnimationFrame(updatePosition);
        }
        
        return { ...prev, x: newX, y: newY };
      });
    };

    updatePosition();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [targetPosition]);

  // Convert real-time strokes to canvas format (filter out eraser strokes)
  const canvasStrokes = strokes
    .filter(stroke => stroke.tool === 'brush') // Only show brush strokes
    .map(stroke => ({
      id: stroke.id,
      points: stroke.points,
      color: stroke.color,
      size: stroke.size,
      tool: 'brush' as const,
      timestamp: new Date(stroke.created_at).getTime()
    }));

  return (
    <div 
      className="min-h-screen w-full overflow-hidden fixed inset-0"
      style={{ 
        background: 'var(--background-gradient)',
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
    >
      {/* Start Window Overlay */}
      {!isStarted && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to MultiPainteR
            </h1>
            <p className="text-muted-foreground mb-6">
              A collaborative painting experience on a massive 100 million pixel canvas!
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="text-sm mb-2">
                <span className="text-primary font-semibold">{sessionState.playerCount}</span> active painters
                {sessionState.queueCount > 0 && (
                  <span className="text-orange-500 block">
                    +{sessionState.queueCount} waiting in queue
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Maximum 100 simultaneous painters
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="text-sm text-muted-foreground">
                🎨 Paint together with up to 100 others
              </div>
              <div className="text-sm text-muted-foreground">  
                🗺️ Explore a world of 10,000 × 10,000 pixels
              </div>
              <div className="text-sm text-muted-foreground">
                ✨ Use transparency and various brush sizes
              </div>
              <div className="text-sm text-muted-foreground">
                ⏰ 10 minute painting sessions with 1 minute inactivity timeout
              </div>
            </div>
            
            <LivePreview playerCount={sessionState.playerCount} />
            
            <button
              onClick={async () => {
                console.log('Start Painting button clicked');
                const success = await joinSession();
                if (success) {
                  setIsStarted(true);
                }
              }}
              disabled={!sessionState.canJoin}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
            >
              {sessionState.canJoin ? 'Start Painting' : 'Room Full - Join Queue'}
            </button>
            
            {/* Timelapse Button - smaller and under start button with better separation */}
            <button
              onClick={() => {
                console.log('Timelapse button clicked');
                setIsTimeLapseOpen(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded transition-all duration-300 animate-pulse hover:animate-none border-2 border-blue-400"
            >
              🎬 World Timelapse
            </button>
          </div>
        </div>
      )}

      {/* Queue Overlay */}
      {!sessionState.canJoin && !sessionState.isConnected && isStarted && (
        <QueueOverlay
          playerCount={sessionState.playerCount}
          queueCount={sessionState.queueCount}
          queuePosition={sessionState.queuePosition}
          onCancel={() => setIsStarted(false)}
        />
      )}

      {/* Kicked Overlay */}
      {sessionState.isKicked && (
        <KickedOverlay
          reason={sessionState.kickReason}
          sessionStrokeCount={sessionStrokeCount}
          playerId={sessionState.playerId}
          onRestart={() => {
            resetKick();
            resetStrokeCount();
            setIsStarted(false);
          }}
        />
      )}

      {isStarted && sessionState.isConnected && (
        <>
          {/* Main canvas area - centered with mobile margin */}
          <div className={`absolute inset-0 flex items-center justify-center ${isMobile ? 'mt-36' : ''}`}>
            <WorldCanvas 
              paintState={paintState}
              strokes={canvasStrokes}
              onMove={handleMove}
              onStroke={handleStroke}
              strokeCount={strokes.length}
              playerCount={sessionState.playerCount}
              isConnected={sessionState.isConnected}
            />
          </div>

          {/* Desktop UI */}
          {!isMobile && (
            <>
              {/* Color picker - left side */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                <ColorPicker 
                  color={paintState.color}
                  onColorChange={handleColorChange}
                  size={paintState.size}
                  onSizeChange={handleSizeChange}
                  tool={paintState.tool}
                />
              </div>

              {/* Toolbar - top */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                <ToolBar
                  paintState={paintState}
                  setPaintState={setPaintState}
                  onInfoOpen={() => setIsInfoOpen(true)}
                  onPlayOpen={() => setIsPlayOpen(true)}
                  onMapOpen={() => setIsMapOpen(true)}
                  strokeCount={strokes.length}
                  onColorChange={handleColorChange}
                  onSizeChange={handleSizeChange}
                />
              </div>

              {/* Player stats - bottom left */}
              <div className="absolute bottom-6 left-6 z-10">
                <PlayerStats 
                  strokeCount={strokes.length} 
                  playerCount={sessionState.playerCount}
                  isConnected={sessionState.isConnected}
                />
              </div>
            </>
          )}

          {/* Mobile UI */}
          {isMobile && (
            <MobileOverlay
              paintState={paintState}
              onColorChange={handleColorChange}
              onToolChange={handleToolChange}
              onSizeChange={handleSizeChange}
              onMove={handleMove}
                onInfoOpen={() => setIsInfoOpen(true)}
                onPlayOpen={() => setIsPlayOpen(true)}
                onMapOpen={() => setIsMapOpen(true)}
              strokeCount={strokes.length}
              playerCount={sessionState.playerCount}
              isConnected={sessionState.isConnected}
            />
          )}

          {/* Dialogs & Overlays */}
          <InfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} />
          
          <AnimationReplay 
            strokes={canvasStrokes}
            isOpen={isPlayOpen}
            onClose={() => setIsPlayOpen(false)}
          />

          <TimeLapse
            isOpen={isTimeLapseOpen}
            onClose={() => setIsTimeLapseOpen(false)}
          />

          {/* World Map Overlay */}
          {isMapOpen && (
            <WorldMinimap
              worldX={paintState.x}
              worldY={paintState.y}
              lastStrokeX={lastStrokePosition.x}
              lastStrokeY={lastStrokePosition.y}
              strokes={canvasStrokes}
              currentPlayerId={sessionState.playerId || undefined}
              onClose={() => setIsMapOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;