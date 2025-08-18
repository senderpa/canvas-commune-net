import { useState, useCallback, useEffect } from 'react';

interface MobileControlsProps {
  onMove: (deltaX: number, deltaY: number) => void;
}

const MobileControls = ({ onMove }: MobileControlsProps) => {
  const [activeDirection, setActiveDirection] = useState<string | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent, direction: string) => {
    e.preventDefault();
    setActiveDirection(direction);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setActiveDirection(null);
  }, []);

  // Continuous movement while pressed
  useEffect(() => {
    if (!activeDirection) return;

    const moveSpeed = 8; // pixels per frame
    let animationId: number;

    const move = () => {
      switch (activeDirection) {
        case 'up':
          onMove(0, -moveSpeed);
          break;
        case 'down':
          onMove(0, moveSpeed);
          break;
        case 'left':
          onMove(-moveSpeed, 0);
          break;
        case 'right':
          onMove(moveSpeed, 0);
          break;
      }
      animationId = requestAnimationFrame(move);
    };

    move();
    return () => cancelAnimationFrame(animationId);
  }, [activeDirection, onMove]);

  const ArrowButton = ({ direction, children }: { direction: string; children: React.ReactNode }) => (
    <button
      className={`
        w-12 h-12 rounded-lg border border-border
        flex items-center justify-center
        touch-manipulation select-none
        transition-all duration-150
        ${activeDirection === direction 
          ? 'bg-primary text-primary-foreground shadow-lg scale-95' 
          : 'bg-card/80 backdrop-blur-sm hover:bg-card/90'
        }
      `}
      onTouchStart={(e) => handleTouchStart(e, direction)}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={(e) => handleTouchStart(e, direction)}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <div className="grid grid-cols-3 gap-2 w-fit">
        {/* Top row */}
        <div />
        <ArrowButton direction="up">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </ArrowButton>
        <div />
        
        {/* Middle row */}
        <ArrowButton direction="left">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </ArrowButton>
        
        <div className="w-12 h-12 rounded-lg border border-border bg-muted/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l7-7 3 3-7 7-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13l-1.5-7.5L2.5 3l2 14.5L18 13z" />
          </svg>
        </div>
        
        <ArrowButton direction="right">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </ArrowButton>
        
        {/* Bottom row */}
        <div />
        <ArrowButton direction="down">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </ArrowButton>
        <div />
      </div>
    </div>
  );
};

export default MobileControls;