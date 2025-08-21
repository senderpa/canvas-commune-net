import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface EmojiSelectionOverlayProps {
  onEmojiSelected: (emoji: string) => void;
}

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '🫨', '😏', '😒',
  '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
  '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥',
  '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
  '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
  '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹',
  '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵'
];

const EmojiSelectionOverlay = ({ onEmojiSelected }: EmojiSelectionOverlayProps) => {
  const [selectedIndex, setSelectedIndex] = useState(Math.floor(emojis.length / 2));
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number>();
  const holdIntervalRef = useRef<NodeJS.Timeout>();
  const holdTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Auto-scroll effect for slot machine feel
  useEffect(() => {
    let autoScrollInterval: NodeJS.Timeout;
    
    const startAutoScroll = () => {
      if (autoScrollRef.current || isScrolling) return; // Don't start if already scrolling
      
      setIsScrolling(true);
      let scrollSpeed = 1;
      let direction = Math.random() > 0.5 ? 1 : -1;
      let targetIndex = selectedIndex;
      let frameCount = 0;
      const maxFrames = 60; // Limit animation frames to prevent infinite loops
      
      const scroll = () => {
        frameCount++;
        
        // Force stop after max frames to prevent infinite loops
        if (frameCount >= maxFrames) {
          setIsScrolling(false);
          autoScrollRef.current = undefined;
          return;
        }
        
        targetIndex += direction * scrollSpeed;
        
        if (targetIndex < 0) targetIndex = emojis.length - 1;
        if (targetIndex >= emojis.length) targetIndex = 0;
        
        setSelectedIndex(targetIndex);
        
        // Gradually slow down
        scrollSpeed *= 0.95;
        
        if (scrollSpeed > 0.02) {
          autoScrollRef.current = requestAnimationFrame(scroll);
        } else {
          setIsScrolling(false);
          autoScrollRef.current = undefined;
        }
      };
      
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    
    // Start auto scroll every 4-6 seconds when not interacting
    const startInterval = () => {
      autoScrollInterval = setInterval(() => {
        if (!isScrolling && !autoScrollRef.current && Math.random() > 0.8) {
          startAutoScroll();
        }
      }, 2000);
    };
    
    // Delay initial start
    const initialTimeout = setTimeout(startInterval, 3000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(autoScrollInterval);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = undefined;
      }
      // Clean up hold intervals
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      setIsScrolling(false);
    };
  }, [selectedIndex, isScrolling]);
  
  const handleScroll = (direction: 1 | -1) => {
    // Stop auto scroll and clear any pending animations
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = undefined;
    }
    setIsScrolling(false);
    
    let newIndex = selectedIndex + direction;
    if (newIndex < 0) newIndex = emojis.length - 1;
    if (newIndex >= emojis.length) newIndex = 0;
    setSelectedIndex(newIndex);
  };

  const startHolding = (direction: 1 | -1) => {
    // Clear any existing intervals
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    
    // Initial scroll
    handleScroll(direction);
    
    // Start continuous scrolling after delay
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        handleScroll(direction);
      }, 150); // Scroll every 150ms when holding
    }, 500); // Wait 500ms before starting continuous scroll
  };

  const stopHolding = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = undefined;
    }
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = undefined;
    }
  };
  
  const handleEmojiClick = (index: number) => {
    // Stop any auto scroll and clear animations
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = undefined;
    }
    setIsScrolling(false);
    
    setSelectedIndex(index);
  };
  
  const selectedEmoji = emojis[selectedIndex];
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-lg w-full mx-4 text-center shadow-2xl">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Which emoji are you?
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Choose your avatar for the canvas adventure!
        </p>
        
        {/* Selected emoji showcase */}
        <div className="mb-8 relative">
          <div className="relative inline-block">
            {/* Glowing square around selected emoji */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl blur-lg opacity-60 animate-pulse"></div>
            <div className="relative bg-card border-2 border-primary rounded-xl p-4 shadow-xl">
              <div className="text-8xl leading-none select-none">
                {selectedEmoji}
              </div>
            </div>
          </div>
        </div>
        
        {/* Horizontal emoji scroll - slot machine style */}
        <div className="relative mb-8">
          {/* Left scroll button */}
          <button
            onMouseDown={() => startHolding(-1)}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={() => startHolding(-1)}
            onTouchEnd={stopHolding}
            disabled={isScrolling}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 shadow-lg select-none"
          >
            ←
          </button>
          
          {/* Right scroll button */}
          <button
            onMouseDown={() => startHolding(1)}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={() => startHolding(1)}
            onTouchEnd={stopHolding}
            disabled={isScrolling}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 shadow-lg select-none"
          >
            →
          </button>
          
          {/* Emoji scroll container */}
          <div 
            ref={scrollContainerRef}
            className="flex items-center justify-center gap-2 py-4 px-12 bg-muted/30 rounded-xl border border-border/50 overflow-hidden"
            style={{ 
              maskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)'
            }}
          >
            {/* Show 7 emojis: 3 before, selected, 3 after */}
            {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
              let index = selectedIndex + offset;
              if (index < 0) index += emojis.length;
              if (index >= emojis.length) index -= emojis.length;
              
              const isCenter = offset === 0;
              const distance = Math.abs(offset);
              
              return (
                <button
                  key={`${index}-${offset}`}
                  onClick={() => handleEmojiClick(index)}
                  disabled={isScrolling}
                  className={`
                    transition-all duration-200 flex-shrink-0 select-none
                    ${isCenter ? 'text-6xl scale-110 z-10' : distance === 1 ? 'text-4xl opacity-70' : 'text-2xl opacity-40'}
                    ${isScrolling ? 'cursor-wait' : 'cursor-pointer hover:scale-125'}
                  `}
                >
                  {emojis[index]}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Pick button */}
        <Button
          onClick={() => {
            // Force stop any ongoing animations and reset state
            if (autoScrollRef.current) {
              cancelAnimationFrame(autoScrollRef.current);
              autoScrollRef.current = undefined;
            }
            setIsScrolling(false);
            
            // Save to session storage
            sessionStorage.setItem('selectedEmoji', selectedEmoji);
            
            // Small delay to ensure state is updated
            setTimeout(() => {
              onEmojiSelected(selectedEmoji);
            }, 50);
          }}
          disabled={isScrolling}
          size="lg"
          className="w-full text-xl py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScrolling ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Spinning...
            </div>
          ) : (
            '🎯 Pick This Emoji!'
          )}
        </Button>
        
        {isScrolling && (
          <p className="text-xs text-muted-foreground mt-4 animate-pulse">
            🎰 Slot machine spinning...
          </p>
        )}
      </div>
    </div>
  );
};

export default EmojiSelectionOverlay;