import { useCallback } from 'react';

interface MobileControlsProps {
  onMove: (deltaX: number, deltaY: number) => void;
}

const MobileControls = ({ onMove }: MobileControlsProps) => {
  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const moveDistance = 100;
    switch (direction) {
      case 'up': onMove(0, -moveDistance); break;
      case 'down': onMove(0, moveDistance); break;
      case 'left': onMove(-moveDistance, 0); break;
      case 'right': onMove(moveDistance, 0); break;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 flex flex-col gap-2 z-50">
      <button 
        className="w-12 h-12 bg-primary/20 backdrop-blur rounded-lg flex items-center justify-center text-primary touch-manipulation"
        onTouchStart={() => handlePan('up')}
        onClick={() => handlePan('up')}
      >
        ↑
      </button>
      <div className="flex gap-2">
        <button 
          className="w-12 h-12 bg-primary/20 backdrop-blur rounded-lg flex items-center justify-center text-primary touch-manipulation"
          onTouchStart={() => handlePan('left')}
          onClick={() => handlePan('left')}
        >
          ←
        </button>
        <button 
          className="w-12 h-12 bg-primary/20 backdrop-blur rounded-lg flex items-center justify-center text-primary touch-manipulation"
          onTouchStart={() => handlePan('right')}
          onClick={() => handlePan('right')}
        >
          →
        </button>
      </div>
      <button 
        className="w-12 h-12 bg-primary/20 backdrop-blur rounded-lg flex items-center justify-center text-primary touch-manipulation"
        onTouchStart={() => handlePan('down')}
        onClick={() => handlePan('down')}
      >
        ↓
      </button>
    </div>
  );
};

export default MobileControls;