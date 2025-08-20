import { useState, useEffect, useCallback, useRef } from 'react';
import WorldCanvas from '@/components/WorldCanvas';
import ToolBar from '@/components/ToolBar';
import MobileOverlay from '@/components/MobileOverlay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePlayerSession } from '@/hooks/usePlayerSession';
import EmojiSelectionOverlay from '@/components/EmojiSelectionOverlay';
import WorldMinimap from '@/components/WorldMinimap';
import { supabase } from '@/integrations/supabase/client';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush';
  timestamp: number;
}

export type Tool = 'brush';

export interface PaintState {
  x: number;
  y: number;
  tool: Tool;
  color: string;
  size: number;
}

const Index = () => {
  const [paintState, setPaintState] = useState<PaintState>({
    x: 0,
    y: 0,
    tool: 'brush',
    color: '#000000',
    size: 5,
  });

  const [showWelcome, setShowWelcome] = useState(true);
  const [showEmojiSelection, setShowEmojiSelection] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    sessionState,
    joinSession,
    leaveSession,
    updatePosition,
    updatePaintState,
    checkCollisions,
    resetKick,
  } = usePlayerSession();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [lastStrokeX, setLastStrokeX] = useState(5000);
  const [lastStrokeY, setLastStrokeY] = useState(5000);
  const [strokeCount, setStrokeCount] = useState(0);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStrokesLoading, setIsStrokesLoading] = useState(false);
  const [strokesError, setStrokesError] = useState<Error | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [canJoin, setCanJoin] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [isKicked, setIsKicked] = useState(false);
  const [kickReason, setKickReason] = useState<'timeout' | 'inactivity' | 'full' | 'disconnected' | 'collision' | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentPlayerEmoji, setCurrentPlayerEmoji] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isFirstStroke, setIsFirstStroke] = useState(true);
  const [isEmojiSelected, setIsEmojiSelected] = useState(false);
  const [isEmojiSelectionComplete, setIsEmojiSelectionComplete] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [emojiSelection, setEmojiSelection] = useState<string[]>([]);
  const [isEmojiSelectionOverlayOpen, setIsEmojiSelectionOverlayOpen] = useState(false);
  // Use simple window size detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStartPainting = () => {
    setShowWelcome(false);
    setShowEmojiSelection(true);
  };

  const handleEmojiSelect = async (emoji: string) => {
    setShowEmojiSelection(false);
    const success = await joinSession(emoji);
    if (!success) {
      setShowWelcome(true);
    }
  };

  const handleMove = useCallback(
    async (deltaX: number, deltaY: number) => {
      const newX = paintState.x + deltaX;
      const newY = paintState.y + deltaY;

      setPaintState((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));

      updatePosition(newX, newY);
      setLastStrokeX(newX);
      setLastStrokeY(newY);
    },
    [paintState.x, paintState.y, updatePosition]
  );

  const handleStroke = useCallback(
    async (stroke: Omit<Stroke, 'id' | 'timestamp'>) => {
      if (!sessionState.isConnected) {
        toast({
          title: 'Not connected',
          description: 'Please connect to the server to draw',
        });
        return;
      }

      const newStroke = {
        ...stroke,
        id: Math.random().toString(36).substring(2),
        timestamp: Date.now(),
      };

      setStrokes((prev) => [...prev, newStroke]);
      setStrokeCount((prev) => prev + 1);
      setLastStrokeX(stroke.points[stroke.points.length - 1].x);
      setLastStrokeY(stroke.points[stroke.points.length - 1].y);
    },
    [sessionState.isConnected, toast]
  );

  useEffect(() => {
    if (sessionState.isConnected) {
      setCurrentPlayerId(sessionState.playerId);
      setCurrentPlayerEmoji(sessionState.selectedEmoji);
    }
  }, [sessionState.isConnected, sessionState.playerId, sessionState.selectedEmoji]);

  useEffect(() => {
    if (sessionState.isKicked) {
      toast({
        title: 'Kicked',
        description: `You were kicked from the server. Reason: ${sessionState.kickReason}`,
      });
    }
  }, [sessionState.isKicked, sessionState.kickReason, toast]);

  useEffect(() => {
    if (sessionState.isConnected) {
      updatePaintState(paintState.color, paintState.tool, paintState.size);
    }
  }, [paintState.color, paintState.tool, paintState.size, sessionState.isConnected, updatePaintState]);

  // Show welcome screen with selected emoji in title
  if (showWelcome) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center space-y-8 max-w-md mx-auto">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome {sessionState.selectedEmoji || ''} to MultiPainteR
            </h1>
            <p className="text-muted-foreground text-lg">
              A collaborative infinite canvas where creativity meets community
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleStartPainting}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg text-lg"
            >
              Start Painting
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${sessionState.isConnected ? 'bg-green-500' : 'bg-muted'}`} />
              <span>{sessionState.playerCount} painters online</span>
              {sessionState.queueCount > 0 && (
                <span className="text-amber-500">• {sessionState.queueCount} in queue</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Emoji selection overlay
  if (showEmojiSelection) {
    return (
      <EmojiSelectionOverlay onEmojiSelect={handleEmojiSelect} />
    );
  }

  // Kicked overlay
  if (sessionState.isKicked) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold mb-4">You were kicked!</h1>
          <p className="text-muted-foreground mb-6">
            Reason: {sessionState.kickReason}
          </p>
          <Button onClick={() => {
            resetKick();
            setShowWelcome(true);
          }} className="w-full">
            Back to Welcome Screen
          </Button>
        </div>
      </div>
    );
  }

  // Queue overlay
  if (sessionState.queuePosition > 0 && !sessionState.isConnected) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold mb-4">You are in the queue!</h1>
          <p className="text-muted-foreground mb-6">
            Position: {sessionState.queuePosition}
          </p>
          <p className="text-muted-foreground mb-6">
            Please wait, you will be connected automatically.
          </p>
        </div>
      </div>
    );
  }

  // Main painting interface
  return (
    <>
      {isMobile ? (
        <MobileOverlay
          paintState={paintState}
          onColorChange={(color) => setPaintState(prev => ({ ...prev, color }))}
          onToolChange={(tool) => setPaintState(prev => ({ ...prev, tool }))}
          onSizeChange={(size) => setPaintState(prev => ({ ...prev, size }))}
          onMove={handleMove}
          onInfoOpen={() => {}}
          onPlayOpen={() => {}}
          onMapOpen={() => setShowMinimap(!showMinimap)}
          strokeCount={strokeCount}
          playerCount={sessionState.playerCount}
          isConnected={sessionState.isConnected}
        />
      ) : (
        <div className="absolute top-4 left-4 z-50">
          <ToolBar
            paintState={paintState}
            setPaintState={setPaintState}
            onInfoOpen={() => {}}
            onPlayOpen={() => {}}
            onMapOpen={() => setShowMinimap(!showMinimap)}
            strokeCount={strokeCount}
            onColorChange={(color) => setPaintState(prev => ({ ...prev, color }))}
            onSizeChange={(size) => setPaintState(prev => ({ ...prev, size }))}
          />
        </div>
      )}

      <WorldCanvas
        paintState={paintState}
        strokes={strokes}
        onMove={handleMove}
        onStroke={handleStroke}
        strokeCount={strokeCount}
        playerCount={sessionState.playerCount}
        isConnected={sessionState.isConnected}
        currentPlayerEmoji={currentPlayerEmoji}
        currentPlayerId={currentPlayerId}
      />

      {showMinimap && (
        <WorldMinimap
          worldX={paintState.x}
          worldY={paintState.y}
          lastStrokeX={lastStrokeX}
          lastStrokeY={lastStrokeY}
          strokes={strokes}
          currentPlayerId={currentPlayerId}
          currentPlayerEmoji={currentPlayerEmoji}
          onClose={() => setShowMinimap(false)}
        />
      )}
    </>
  );
};

export default Index;
