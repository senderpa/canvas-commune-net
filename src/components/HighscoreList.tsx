import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Trophy, Medal, Award } from 'lucide-react';
import { useHighscores } from '@/hooks/useHighscores';

interface HighscoreListProps {
  isOpen: boolean;
  onClose: () => void;
}

const HighscoreList = ({ isOpen, onClose }: HighscoreListProps) => {
  const { highscores, isLoading, fetchHighscores } = useHighscores();

  useEffect(() => {
    if (isOpen) {
      fetchHighscores();
    }
  }, [isOpen, fetchHighscores]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{position}</span>;
    }
  };

  const getRankBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
      default:
        return 'bg-card/50 border-border/50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-hidden animate-slide-in-right">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-700 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Highscores
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading highscores...</p>
            </div>
          ) : highscores.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No highscores yet!</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to paint 999+ strokes!</p>
            </div>
          ) : (
            highscores.map((score, index) => {
              const position = index + 1;
              return (
                <div 
                  key={score.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${getRankBg(position)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(position)}
                    </div>
                    <div className="text-2xl font-bold">
                      {score.emoji_id}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {score.stroke_count.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      strokes
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            🎨 Paint 999+ strokes to join the leaderboard!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HighscoreList;