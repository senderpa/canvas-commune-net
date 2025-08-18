import { useState, useCallback, useEffect } from 'react';
import WorldCanvas from '@/components/WorldCanvas';
import ColorPicker from '@/components/ColorPicker';
import ToolBar from '@/components/ToolBar';
import Minimap from '@/components/Minimap';
import PlayerStats from '@/components/PlayerStats';
import MobileControls from '@/components/MobileControls';
import InfoDialog from '@/components/InfoDialog';
import AnimationReplay from '@/components/AnimationReplay';
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
  
  // Generate random starting position
  const [initialPosition] = useState(() => ({
    x: Math.floor(Math.random() * (1000000 - 512)),
    y: Math.floor(Math.random() * (1000000 - 512))
  }));
  
  const [paintState, setPaintState] = useState<PaintState>({
    color: '#ff0080',
    tool: 'brush',
    size: 3,
    ...initialPosition
  });
  
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPlayOpen, setIsPlayOpen] = useState(false);
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

  const handleMinimapJump = useCallback((x: number, y: number) => {
    const newX = Math.max(0, Math.min(1000000 - 512, x));
    const newY = Math.max(0, Math.min(1000000 - 512, y));
    setTargetPosition({ x: newX, y: newY });
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
      className="min-h-screen w-full overflow-hidden"
      style={{ background: 'var(--background-gradient)' }}
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
          tool={paintState.tool}
          size={paintState.size}
          onToolChange={handleToolChange}
          onSizeChange={handleSizeChange}
        />
      </div>

      {/* Minimap - top right */}
      <div className="absolute top-6 right-6 z-10">
        <Minimap 
          worldX={paintState.x}
          worldY={paintState.y}
          strokes={strokes}
        />
      </div>

      {/* Player stats - bottom right */}
      <div className="absolute bottom-6 right-6 z-10">
        <PlayerStats strokeCount={strokeCount} />
      </div>

      {/* Control buttons - bottom left */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-3">
        <button
          onClick={() => setIsInfoOpen(true)}
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 hover:bg-card/90 transition-all duration-300"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        <button
          onClick={() => setIsPlayOpen(true)}
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 hover:bg-card/90 transition-all duration-300"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Mobile controls - bottom center */}
      {isMobile && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <MobileControls onMove={handleMove} />
        </div>
      )}

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