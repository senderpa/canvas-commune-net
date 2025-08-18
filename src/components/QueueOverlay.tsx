import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface QueueOverlayProps {
  playerCount: number;
  queuePosition: number;
  onCancel: () => void;
}

const QueueOverlay = ({ playerCount, queuePosition, onCancel }: QueueOverlayProps) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const waitingCount = Math.max(0, playerCount - 100);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4 text-primary">
          MultiPainter is Full!
        </h2>
        
        <div className="space-y-4 mb-6 text-muted-foreground">
          <p>
            All <span className="font-semibold text-primary">100 painting slots</span> are currently occupied.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm mb-2">
              <span className="text-primary font-semibold">{playerCount}</span> active painters
            </div>
            {waitingCount > 0 && (
              <div className="text-sm">
                <span className="text-yellow-400 font-semibold">{waitingCount}</span> waiting in queue
              </div>
            )}
          </div>
          
          <p className="text-sm">
            Waiting for a slot to open{dots}
          </p>
          
          <p className="text-xs text-muted-foreground/70">
            Players are automatically removed after 10 minutes or 1 minute of inactivity.
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (playerCount / 100) * 100)}%` }}
            />
          </div>
          
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full"
          >
            Cancel & Return
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QueueOverlay;