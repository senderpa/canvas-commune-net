import { useState } from 'react';
import { Button } from '@/components/ui/button';
import MobileControls from './MobileControls';
import MobileColorPicker from './MobileColorPicker';
import PlayerStats from './PlayerStats';
import { PaintState, Tool } from '@/pages/Index';

interface MobileOverlayProps {
  paintState: PaintState;
  onColorChange: (color: string) => void;
  onToolChange: (tool: Tool) => void;
  onSizeChange: (size: number) => void;
  onMove: (deltaX: number, deltaY: number) => void;
  onInfoOpen: () => void;
  onPlayOpen: () => void;
  onMapOpen: () => void;
  strokeCount: number;
  playerCount: number;
  isConnected: boolean;
}

const MobileOverlay = ({
  paintState,
  onColorChange,
  onToolChange,
  onSizeChange,
  onMove,
  onInfoOpen,
  onPlayOpen,
  onMapOpen,
  strokeCount,
  playerCount,
  isConnected,
}: MobileOverlayProps) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  return (
    <>
      {/* Top toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 flex items-center justify-between">
          {/* Tool selection */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={paintState.tool === 'brush' ? 'default' : 'outline'}
              onClick={() => onToolChange('brush')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={paintState.tool === 'eraser' ? 'default' : 'outline'}
              onClick={() => onToolChange('eraser')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onMapOpen}>
              🗺️
            </Button>
            <Button size="sm" variant="outline" onClick={onInfoOpen}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
            <Button size="sm" variant="outline" onClick={onPlayOpen}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a6 6 0 002 4.472" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Size slider - horizontal */}
      <div className="absolute top-16 left-4 right-4 z-20">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={paintState.size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-6 text-center">{paintState.size}</span>
            <div
              className="rounded-full border border-border"
              style={{
                width: `${Math.max(4, paintState.size)}px`,
                height: `${Math.max(4, paintState.size)}px`,
                backgroundColor: paintState.tool === 'eraser' ? 'transparent' : paintState.color,
                borderStyle: paintState.tool === 'eraser' ? 'dashed' : 'solid'
              }}
            />
          </div>
        </div>
      </div>

      {/* Color picker button */}
      <div className="absolute top-32 left-4 z-20">
        <button
          onClick={() => setIsColorPickerOpen(true)}
          className="w-12 h-12 rounded-lg border-2 border-border shadow-lg hover:scale-110 transition-transform"
          style={{ backgroundColor: paintState.color }}
        />
      </div>

      {/* Player Stats - Bottom Left */}
      <div className="absolute bottom-20 left-4 z-20">
        <PlayerStats 
          strokeCount={strokeCount} 
          playerCount={playerCount}
          isConnected={isConnected}
        />
      </div>

      {/* Mobile controls */}
      <div className="absolute bottom-4 right-4 z-20">
        <MobileControls onMove={onMove} />
      </div>

      {/* Color picker modal */}
      <MobileColorPicker
        color={paintState.color}
        onColorChange={onColorChange}
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
      />
    </>
  );
};

export default MobileOverlay;