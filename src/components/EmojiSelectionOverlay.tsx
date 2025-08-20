
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface EmojiSelectionOverlayProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiSelectionOverlay = ({ onEmojiSelect }: EmojiSelectionOverlayProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');

  // All emojis in one array for slot machine effect
  const allEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
    '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
    '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'
  ];

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
  };

  const handlePickEmoji = () => {
    if (selectedEmoji) {
      onEmojiSelect(selectedEmoji);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-8 max-w-2xl w-full mx-4 text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Choose Your Emoji
        </h1>
        <p className="text-muted-foreground mb-6">
          Pick your emoji?
        </p>
        
        {/* Selected emoji display with glowing square - 3x bigger */}
        <div className="flex justify-center mb-8">
          <div className={`w-32 h-32 border-4 rounded-lg flex items-center justify-center text-8xl transition-all duration-300 ${
            selectedEmoji 
              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/50 animate-pulse' 
              : 'border-dashed border-border bg-muted/20'
          }`}>
            {selectedEmoji || '?'}
          </div>
        </div>

        {/* Slot machine style horizontal emoji picker */}
        <div className="mb-8 relative">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-muted/20">
            <div className="flex gap-2 pb-4" style={{ width: 'max-content' }}>
              {allEmojis.map((emoji, index) => (
                <button
                  key={`emoji-${index}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className={`flex-shrink-0 w-20 h-20 text-5xl rounded-lg transition-all duration-200 hover:scale-110 hover:bg-muted/50 ${
                    selectedEmoji === emoji 
                      ? 'bg-primary/20 ring-4 ring-primary/50 scale-105' 
                      : 'hover:bg-muted/30'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          {/* Slot machine effect indicators */}
          <div className="absolute left-1/2 top-0 bottom-0 w-24 -translate-x-1/2 pointer-events-none">
            <div className="h-full border-l-4 border-r-4 border-primary/30 rounded-lg bg-primary/5"></div>
          </div>
        </div>

        <Button
          onClick={handlePickEmoji}
          disabled={!selectedEmoji}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Pick This Emoji
        </Button>
      </div>
    </div>
  );
};

export default EmojiSelectionOverlay;
