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
  
  // Auto-scroll effect for slot machine feel
  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollRef.current) return; // Don't start if already scrolling
      
      setIsScrolling(true);
      let scrollSpeed = 1;
      let direction = Math.random() > 0.5 ? 1 : -1;
      let targetIndex = selectedIndex;
      
      const scroll = () => {
        targetIndex += direction * scrollSpeed;
        
        if (targetIndex < 0) targetIndex = emojis.length - 1;
        if (targetIndex >= emojis.length) targetIndex = 0;
        
        setSelectedIndex(targetIndex);
        
        // Gradually slow down
        scrollSpeed *= 0.98;
        
        if (scrollSpeed > 0.05) {
          autoScrollRef.current = requestAnimationFrame(scroll);
        } else {
          setIsScrolling(false);
          autoScrollRef.current = undefined;
        }
      };
      
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    
    // Start auto scroll every 3-5 seconds when not interacting
    const interval = setInterval(() => {
      if (!isScrolling && Math.random() > 0.7) {
        startAutoScroll();
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [selectedIndex, isScrolling]);
  
  const handleScroll = (direction: 1 | -1) => {
    if (isScrolling) return;
    
    // Stop auto scroll
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = undefined;
      setIsScrolling(false);
    }
    
    let newIndex = selectedIndex + direction;
    if (newIndex < 0) newIndex = emojis.length - 1;
    if (newIndex >= emojis.length) newIndex = 0;
    setSelectedIndex(newIndex);
  };
  
  const handleEmojiClick = (index: number) => {
    if (isScrolling) return;
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
            onClick={() => handleScroll(-1)}
            disabled={isScrolling}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 shadow-lg"
          >
            ←
          </button>
          
          {/* Right scroll button */}
          <button
            onClick={() => handleScroll(1)}
            disabled={isScrolling}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 shadow-lg"
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
          onClick={() => onEmojiSelected(selectedEmoji)}
          disabled={isScrolling}
          size="lg"
          className="w-full text-xl py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
        >
          🎯 Pick This Emoji!
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