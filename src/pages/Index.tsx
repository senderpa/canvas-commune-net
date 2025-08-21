import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast"
import { 
  EmojiSelectionOverlay, 
  QueueOverlay, 
  KickedOverlay, 
  WorldCanvas, 
  ToolBar, 
  MobileOverlay, 
  InfoDialog, 
  AnimationReplay,
  WorldMinimap,
  LivePreview,
  PlayerStats
} from '@/components';
import { Toaster } from "@/components/ui/toaster"
import { usePlayerSession } from '@/hooks/usePlayerSession';

export type Tool = 'brush' | 'hand';

export interface PaintState {
  x: number;
  y: number;
  color: string;
  size: number;
  tool: Tool;
}

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

const Index = () => {
  const [paintState, setPaintState] = useState<PaintState>({
    x: 5000,
    y: 5000,
    color: '#ff0080',
    size: 5,
    tool: 'brush'
  });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [showEmojiSelector, setShowEmojiSelector] = useState(true);
  const [userMousePosition, setUserMousePosition] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const { toast } = useToast()

  const { 
    isActive, 
    sessionToken, 
    playerId,
    collisionCount, 
    kickReason, 
    joinSession, 
    leaveSession, 
    handleCollision,
    sessionStrokeCount 
  } = usePlayerSession();

  // Connection status
  useEffect(() => {
    setIsConnected(isActive);
  }, [isActive]);

  // Join session on mount if emoji is selected
  useEffect(() => {
    if (selectedEmoji && !isActive) {
      joinSession(selectedEmoji);
    }
  }, [selectedEmoji, isActive, joinSession]);

  // Fetch initial player count on mount
  useEffect(() => {
    const fetchPlayerCount = async () => {
      try {
        const { data, error } = await supabase
          .from('painting_sessions')
          .select('player_count')
          .eq('id', 'global')
          .single();

        if (error) {
          console.error('Error fetching player count:', error);
        } else {
          setPlayerCount(data?.player_count || 0);
        }
      } catch (error) {
        console.error('Error fetching player count:', error);
      }
    };

    fetchPlayerCount();
  }, []);

  // Subscribe to player count changes
  useEffect(() => {
    const channel = supabase
      .channel('player_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'painting_sessions' }, payload => {
        if (payload.new) {
          setPlayerCount(payload.new.player_count);
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []);

  // Stroke management
  const handleStroke = useCallback((stroke: Omit<Stroke, 'id' | 'timestamp'>) => {
    const newStroke = { ...stroke, id: uuidv4(), timestamp: Date.now() };
    setStrokes(prev => [...prev, newStroke]);
  }, []);

  // Movement
  const handleMove = useCallback((deltaX: number, deltaY: number) => {
    setPaintState(prev => ({
      ...prev,
      x: Math.max(0, Math.min(10000, prev.x + deltaX)),
      y: Math.max(0, Math.min(10000, prev.y + deltaY))
    }));
  }, []);

  // Color change
  const handleColorChange = useCallback((color: string) => {
    setPaintState(prev => ({ ...prev, color }));
  }, []);

  // Size change
  const handleSizeChange = useCallback((size: number) => {
    setPaintState(prev => ({ ...prev, size }));
  }, []);

  // Tool change
  const handleToolChange = useCallback((tool: Tool) => {
    setPaintState(prev => ({ ...prev, tool }));
  }, []);

  const handleKickedRestart = () => {
    // Reset all necessary state
    setSelectedEmoji('');
    setShowEmojiSelector(true);
    setPaintState(prev => ({ ...prev, x: 5000, y: 5000 })); // Reset to center
    setStrokes([]);
    setUserMousePosition({ x: 0, y: 0 });
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      setShowEmojiSelector(true);
    }, 2000);
  };

  // Handle URL parameters for live preview
  useEffect(() => {
    const preview = searchParams.get('preview');
    if (preview === 'true') {
      setShowLivePreview(true);
    }
  }, [searchParams]);

  // Modify the kickReason handling to include 'hits'
  useEffect(() => {
    if (collisionCount >= 3) {
      // Force leave session when hit 3 times - this should trigger 'hits' reason
      leaveSession();
    }
  }, [collisionCount, leaveSession]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Show emoji selector if no emoji selected */}
      {showEmojiSelector && (
        <EmojiSelectionOverlay
          onEmojiSelect={(emoji) => {
            setSelectedEmoji(emoji);
            setShowEmojiSelector(false);
          }}
        />
      )}

      {/* Show queue if not active and emoji is selected */}
      {!isActive && selectedEmoji && !showEmojiSelector && (
        <QueueOverlay 
          onBack={() => {
            setSelectedEmoji('');
            setShowEmojiSelector(true);
          }}
        />
      )}

      {/* Show kicked overlay when session ends */}
      {kickReason && (
        <KickedOverlay
          reason={kickReason}
          onRestart={handleKickedRestart}
          sessionStrokeCount={sessionStrokeCount}
          playerId={playerId}
          sessionToken={sessionToken}
        />
      )}

      {/* Main painting interface */}
      {isActive && selectedEmoji && !kickReason && (
        <>
          {/* Mobile overlay */}
          {isMobile && (
            <MobileOverlay
              paintState={paintState}
              onColorChange={handleColorChange}
              onSizeChange={handleSizeChange}
              onToolChange={handleToolChange}
              onInfoOpen={() => setShowInfo(true)}
              onPlayOpen={() => setShowAnimation(true)}
              onMapOpen={() => setShowMinimap(true)}
              strokeCount={strokes.length}
            />
          )}

          {/* Desktop toolbar */}
          {!isMobile && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
              <ToolBar
                paintState={paintState}
                setPaintState={setPaintState}
                onInfoOpen={() => setShowInfo(true)}
                onPlayOpen={() => setShowAnimation(true)}
                onMapOpen={() => setShowMinimap(true)}
                strokeCount={strokes.length}
                onColorChange={handleColorChange}
                onSizeChange={handleSizeChange}
                onToolChange={handleToolChange}
              />
            </div>
          )}

          {/* Canvas */}
          <WorldCanvas
            paintState={paintState}
            strokes={strokes}
            onMove={handleMove}
            onStroke={handleStroke}
            strokeCount={strokes.length}
            playerCount={playerCount}
            isConnected={isConnected}
            selectedEmoji={selectedEmoji}
            userMousePosition={userMousePosition}
            onMouseMove={setUserMousePosition}
            collisionCount={collisionCount}
            onCollision={handleCollision}
            isDrawingEnabled={paintState.tool === 'brush'}
            currentSessionToken={sessionToken}
          />

          {/* Player stats overlay */}
          <PlayerStats 
            collisionCount={collisionCount}
            sessionStrokeCount={sessionStrokeCount}
          />

          {/* Info Dialog */}
          <InfoDialog open={showInfo} onOpenChange={setShowInfo} />

          {/* Animation Replay Dialog */}
          <AnimationReplay 
            open={showAnimation} 
            onOpenChange={setShowAnimation} 
            strokes={strokes}
          />

          {/* World Minimap */}
          {showMinimap && (
            <WorldMinimap
              worldX={paintState.x}
              worldY={paintState.y}
              lastStrokeX={userMousePosition.x}
              lastStrokeY={userMousePosition.y}
              strokes={strokes}
              currentSessionToken={sessionToken}
              selectedEmoji={selectedEmoji}
              onClose={() => setShowMinimap(false)}
            />
          )}

          {/* Live Preview */}
          {showLivePreview && (
            <LivePreview
              paintState={paintState}
              strokes={strokes}
              onClose={() => setShowLivePreview(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;
