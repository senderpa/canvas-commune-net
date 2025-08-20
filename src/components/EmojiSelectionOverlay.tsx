import { useState } from 'react';
import { Button } from '@/components/ui/button';
import EmojiPicker from '@/components/EmojiPicker';

interface EmojiSelectionOverlayProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiSelectionOverlay = ({ onEmojiSelect }: EmojiSelectionOverlayProps) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  const handleEmojiSelect = (emoji: string) => {
    if (selectedEmojis.includes(emoji) || selectedEmojis.length >= 1) return;
    
    const newEmojis = [...selectedEmojis, emoji];
    setSelectedEmojis(newEmojis);
  };

  const handlePickEmoji = () => {
    if (selectedEmojis.length === 1) {
      onEmojiSelect(selectedEmojis[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Choose Your Emoji
        </h1>
        <p className="text-muted-foreground mb-6">
          Select an emoji that will represent you on the canvas and minimap
        </p>
        
        {/* Selected emoji display with glowing square */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 border-4 rounded-lg flex items-center justify-center text-4xl transition-all duration-300 ${
            selectedEmojis.length > 0 
              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/50 animate-pulse' 
              : 'border-dashed border-border bg-muted/20'
          }`}>
            {selectedEmojis[0] || '?'}
          </div>
        </div>

        {/* Emoji picker with horizontal scroll */}
        <div className="mb-6 max-h-80 overflow-y-auto">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            selectedEmojis={selectedEmojis}
            maxEmojis={1}
          />
        </div>

        <Button
          onClick={handlePickEmoji}
          disabled={selectedEmojis.length === 0}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Pick This Emoji
        </Button>
      </div>
    </div>
  );
};

export default EmojiSelectionOverlay;