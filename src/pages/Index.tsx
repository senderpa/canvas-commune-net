import { useState, useCallback } from 'react';
import Canvas from '@/components/Canvas';
import ColorPicker from '@/components/ColorPicker';
import ToolBar from '@/components/ToolBar';
import Minimap from '@/components/Minimap';
import PlayerStats from '@/components/PlayerStats';
import MobileControls from '@/components/MobileControls';
import InfoDialog from '@/components/InfoDialog';
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
  const [paintState, setPaintState] = useState<PaintState>({
    color: '#ff0080',
    tool: 'brush',
    size: 3,
    x: 500000, // Start at center of 1M×1M world
    y: 500000
  });
  
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
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
    setPaintState(prev => ({
      ...prev,
      x: Math.max(0, Math.min(1000000 - 512, prev.x + deltaX)),
      y: Math.max(0, Math.min(1000000 - 512, prev.y + deltaY))
    }));
  }, []);

  return (
    <div 
      className="min-h-screen w-full overflow-hidden"
      style={{ background: 'var(--background-gradient)' }}
    >
      {/* Main canvas area - always centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Canvas 
          paintState={paintState}
          onMove={handleMove}
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
          onJump={(x, y) => setPaintState(prev => ({ ...prev, x, y }))}
        />
      </div>

      {/* Player stats - bottom right */}
      <div className="absolute bottom-6 right-6 z-10">
        <PlayerStats />
      </div>

      {/* Info button - bottom left */}
      <div className="absolute bottom-6 left-6 z-10">
        <button
          onClick={() => setIsInfoOpen(true)}
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 hover:bg-card/90 transition-all duration-300"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    </div>
  );
};

export default Index;