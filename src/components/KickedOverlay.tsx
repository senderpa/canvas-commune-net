import { Button } from '@/components/ui/button';

interface KickedOverlayProps {
  reason: 'timeout' | 'inactivity' | 'full' | 'disconnected' | null;
  onRestart: () => void;
}

const KickedOverlay = ({ reason, onRestart }: KickedOverlayProps) => {
  const getReasonInfo = () => {
    switch (reason) {
      case 'timeout':
        return {
          title: "Session Timeout",
          message: "Your 10-minute painting session has ended.",
          icon: "⏰"
        };
      case 'inactivity':
        return {
          title: "Inactive Session",
          message: "You were removed due to 1 minute of inactivity.",
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="text-6xl mb-4">{icon}</div>
        
        <h2 className="text-2xl font-bold mb-4 text-primary">
          {title}
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {message}
        </p>
        
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Session Limits:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Maximum 10 minutes per session</li>
            <li>• Automatic timeout after 1 minute of inactivity</li>
            <li>• Maximum 100 simultaneous painters</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onRestart}
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