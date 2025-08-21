import { useState } from 'react';
import { Button } from '@/components/ui/button';
import EmojiPicker from './EmojiPicker';
import { useHighscores } from '@/hooks/useHighscores';

interface KickedOverlayProps {
  reason: 'timeout' | 'inactivity' | 'full' | 'disconnected' | null;
  onRestart: () => void;
  sessionStrokeCount?: number;
  playerId?: string;
  sessionToken?: string;
}

const KickedOverlay = ({ reason, onRestart, sessionStrokeCount = 0, playerId, sessionToken }: KickedOverlayProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const { submitHighscore } = useHighscores();

  const canSubmitHighscore = sessionStrokeCount >= 999 && playerId && !scoreSubmitted && (reason === 'timeout' || reason === 'inactivity');

  const handleEmojiSelect = (emoji: string) => {
    if (selectedEmojis.includes(emoji)) {
      setSelectedEmojis(prev => prev.filter(e => e !== emoji));
    } else if (selectedEmojis.length < 3) {
      setSelectedEmojis(prev => [...prev, emoji]);
    }
  };

  const handleSubmitHighscore = async () => {
    if (selectedEmojis.length !== 3 || !playerId) return;

    setIsSubmittingScore(true);
    const emojiId = selectedEmojis.join('');
    const success = await submitHighscore(emojiId, sessionStrokeCount, playerId, sessionToken);
    
    if (success) {
      setScoreSubmitted(true);
      setShowEmojiPicker(false);
    }
    setIsSubmittingScore(false);
  };

  const handleRestart = () => {
    setSelectedEmojis([]);
    setShowEmojiPicker(false);
    setScoreSubmitted(false);
    onRestart();
  };
  const getReasonInfo = () => {
    switch (reason) {
      case 'timeout':
        return {
          title: "Session Timeout",
          message: "Your 60-minute painting session has ended.",
          icon: "⏰"
        };
      case 'inactivity':
        return {
          title: "Inactive Session",
          message: "You were removed due to 5 minutes of inactivity.",
          icon: "😴"
        };
      case 'full':
        return {
          title: "Room Full",
          message: "All 100 painting slots are currently occupied.",
          icon: "🎨"
        };
      case 'disconnected':
        return {
          title: "Disconnected",
          message: "You left the painting session. Ready to start again?",
          icon: "🔌"
        };
      default:
        return {
          title: "Session Ended",
          message: "Your painting session has ended.",
          icon: "📝"
        };
    }
  };

  const { title, message, icon } = getReasonInfo();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center max-h-[90vh] overflow-y-auto">
        <div className="text-4xl md:text-6xl mb-4">{icon}</div>
        
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary">
          {title}
        </h2>
        
        <p className="text-sm md:text-base text-muted-foreground mb-6">
          {message}
        </p>
        
        {/* Session Stats Display */}
        {sessionStrokeCount > 0 && (reason === 'timeout' || reason === 'inactivity') && (
          <div className="bg-muted/20 rounded-lg p-4 mb-4">
            <div className="text-base md:text-lg font-semibold">Your Session Stats</div>
            <div className="text-2xl md:text-3xl font-bold text-primary">{sessionStrokeCount}</div>
            <div className="text-sm text-muted-foreground">strokes painted</div>
          </div>
        )}
        
        {/* Highscore submission section */}
        {canSubmitHighscore && !showEmojiPicker && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg">
            <div className="text-base md:text-lg font-semibold mb-2">🏆 Congratulations!</div>
            <p className="text-sm mb-3">You painted {sessionStrokeCount} strokes! Save your score to the leaderboard!</p>
            <Button 
              onClick={() => setShowEmojiPicker(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              🏆 Submit to Leaderboard
            </Button>
          </div>
        )}

        {scoreSubmitted && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg">
            <div className="text-base md:text-lg font-semibold mb-2">✅ Score Submitted!</div>
            <p className="text-sm">Your score has been added to the leaderboard!</p>
          </div>
        )}

        {showEmojiPicker && (
          <div className="mb-6">
            <EmojiPicker 
              onEmojiSelect={handleEmojiSelect}
              selectedEmojis={selectedEmojis}
              maxEmojis={3}
            />
            <div className="mt-4 flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setShowEmojiPicker(false)}
                disabled={isSubmittingScore}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitHighscore}
                disabled={selectedEmojis.length !== 3 || isSubmittingScore}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isSubmittingScore ? 'Submitting...' : 'Submit Score'}
              </Button>
            </div>
          </div>
        )}
        
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm md:text-base font-semibold mb-2">Session Limits:</h3>
          <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
            <li>• Maximum 60 minutes per session</li>
            <li>• Automatic timeout after 5 minutes of inactivity</li>
            <li>• Maximum 100 simultaneous painters</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRestart}
            className="w-full bg-primary hover:bg-primary/90"
          >
            🎨 Start New Session
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Click to rejoin the painting experience
          </p>
        </div>
      </div>
    </div>
  );
};

export default KickedOverlay;