import { useState, useCallback, useEffect } from 'react';
import WorldCanvas from '@/components/WorldCanvas';
import ColorPicker from '@/components/ColorPicker';
import ToolBar from '@/components/ToolBar';
import PlayerStats from '@/components/PlayerStats';
import InfoDialog from '@/components/InfoDialog';
import AnimationReplay from '@/components/AnimationReplay';
import WorldMinimap from '@/components/WorldMinimap';
import MobileOverlay from '@/components/MobileOverlay';
import { useIsMobile } from '@/hooks/use-mobile';

export type Tool = 'brush' | 'eraser';

export interface PaintState {
  color: string;
  tool: Tool;
  size: number;
  x: number; // Current viewport position in world coordinates
  y: number;
}

const Index = () => {
  const isMobile = useIsMobile();
  
  // Generate random starting position and color
  const [initialPosition] = useState(() => ({
    x: Math.floor(Math.random() * (1000000 - 512)),
    y: Math.floor(Math.random() * (1000000 - 512))
  }));
  
  // Generate new random color on each page load
  useEffect(() => {
    const colors = ['#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff', '#ff0040', '#40ff00', '#0040ff', '#ff3366', '#33ff66', '#3366ff'];
    const newColor = colors[Math.floor(Math.random() * colors.length)];
    setPaintState(prev => ({ ...prev, color: newColor }));
  }, []);
  
  const [paintState, setPaintState] = useState<PaintState>({
    color: '#ff0080', // Will be overridden by useEffect
    tool: 'brush',
    size: 3,
    ...initialPosition
  });
  
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPlayOpen, setIsPlayOpen] = useState(false);
  const [isMinimapExpanded, setIsMinimapExpanded] = useState(false);
  
  // Don't reset - keep all strokes persistent
  useEffect(() => {
    // Load existing strokes from localStorage on startup
    try {
      const savedStrokes = localStorage.getItem('multipainter-strokes');
      const savedStrokeCount = localStorage.getItem('multipainter-stroke-count');
      
      if (savedStrokes) {
        const parsedStrokes = JSON.parse(savedStrokes);
        setStrokes(parsedStrokes);
        setStrokeCount(parsedStrokes.length);
      }
      
      if (savedStrokeCount) {
        setStrokeCount(parseInt(savedStrokeCount));
      }
    } catch (error) {
      console.error('Failed to load strokes from localStorage:', error);
    }
  }, []);
  
  // Load strokes from localStorage on startup (now empty)
  const [strokes, setStrokes] = useState<Array<{
    id: string;
    points: { x: number; y: number }[];
    color: string;
    size: number;
    tool: 'brush' | 'eraser';
    timestamp: number;
  }>>([]);
  
  const [targetPosition, setTargetPosition] = useState(initialPosition);
  const [strokeCount, setStrokeCount] = useState(0);

  // Save strokes to localStorage whenever strokes change
  useEffect(() => {
    try {
      localStorage.setItem('multipainter-strokes', JSON.stringify(strokes));
      localStorage.setItem('multipainter-stroke-count', strokeCount.toString());
    } catch (error) {
      console.error('Failed to save strokes to localStorage:', error);
    }
  }, [strokes, strokeCount]);
  
  const handleColorChange = useCallback((color: string) => {
    setPaintState(prev => ({ ...prev, color }));
  }, []);
  
  const handleToolChange = useCallback((tool: Tool) => {
    setPaintState(prev => ({ ...prev, tool }));
  }, []);
  
  const handleSizeChange = useCallback((size: number) => {
    setPaintState(prev => ({ ...prev, size }));
  }, []);
  
  const handleMove = useCallback((deltaX: number, deltaY: number) => {
    setTargetPosition(prev => ({
      x: Math.max(0, Math.min(1000000 - 512, prev.x + deltaX)),
      y: Math.max(0, Math.min(1000000 - 512, prev.y + deltaY))
    }));
  }, []);

  const handleStroke = useCallback((stroke: Omit<{
    id: string;
    points: { x: number; y: number }[];
    color: string;
    size: number;
    tool: 'brush' | 'eraser';
    timestamp: number;
  }, 'id' | 'timestamp'>) => {
    // Ensure all stroke points are within world bounds
    const validPoints = stroke.points.filter(point => 
      point.x >= 0 && point.x < 1000000 && point.y >= 0 && point.y < 1000000
    );
    
    if (validPoints.length > 0) {
      const newStroke = {
        ...stroke,
        points: validPoints,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      };
      
      setStrokes(prev => [...prev, newStroke]);
      setStrokeCount(prev => prev + 1);
    }
  }, []);

  // Simulate other players' strokes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Add a random stroke from another "player"
      const colors = ['#ff3366', '#33ff66', '#3366ff', '#ffff33', '#ff33ff', '#33ffff'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Random position in world
      const startX = Math.random() * 1000000;
      const startY = Math.random() * 1000000;
      
      // Create a random stroke with multiple points
      const points = [];
      const numPoints = 5 + Math.floor(Math.random() * 15);
      
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: startX + (Math.random() - 0.5) * 100,
          y: startY + (Math.random() - 0.5) * 100
        });
      }
      
      const newStroke = {
        id: 'bot-' + Math.random().toString(36).substr(2, 9),
        points: points,
        color: randomColor,
        size: 2 + Math.floor(Math.random() * 8),
        tool: 'brush' as const,
        timestamp: Date.now()
      };
      
      setStrokes(prev => [...prev, newStroke]);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

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

  return (
    <div 
      className="min-h-screen w-full overflow-hidden fixed inset-0"
      style={{ 
        background: 'var(--background-gradient)',
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
    >
      {/* Main canvas area - always centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <WorldCanvas 
          paintState={paintState}
          strokes={strokes}
          onMove={handleMove}
          onStroke={handleStroke}
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
            />
          </div>

          {/* Toolbar - top */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
            <ToolBar
              paintState={paintState}
              setPaintState={setPaintState}
              onInfoOpen={() => setIsInfoOpen(true)}
              onPlayOpen={() => setIsPlayOpen(true)}
              strokeCount={strokes.length}
            />
          </div>

          {/* Player stats - bottom left */}
          <div className="absolute bottom-6 left-6 z-10">
            <PlayerStats strokeCount={strokeCount} />
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
          strokeCount={strokeCount}
        />
      )}

      {/* World Minimap */}
      <WorldMinimap
        worldX={paintState.x}
        worldY={paintState.y}
        strokes={strokes}
        isExpanded={isMinimapExpanded}
        onToggleExpanded={() => setIsMinimapExpanded(!isMinimapExpanded)}
      />

      {/* Dialogs */}
      <InfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} />
      
      <AnimationReplay 
        strokes={strokes}
        isOpen={isPlayOpen}
        onClose={() => setIsPlayOpen(false)}
      />
    </div>
  );
};

export default Index;