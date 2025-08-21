import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface InfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InfoDialog = ({ open, onOpenChange }: InfoDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm animate-scale-in data-[state=closed]:animate-scale-out">
        <DialogHeader className="relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute -top-2 -right-2 w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors z-10 border border-border"
          >
            <X className="w-4 h-4" />
          </button>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            MultiPainteR Info
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 text-sm">
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              🎨 Paint together with up to 100 others
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">  
              🗺️ Explore a world of 10,000 × 10,000 pixels
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              ✨ Use transparency and various brush sizes
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              ⏰ 60 minute painting sessions with 5 minute inactivity timeout
            </div>
          </div>
          
          <div className="space-y-1">
            <h4 className="font-medium text-sm">The Canvas</h4>
            <p className="text-muted-foreground leading-relaxed text-xs">
              A massive 10,000 × 10,000 pixel (100 million pixels total) collaborative artwork where up to 100 painters can create simultaneously. 
              Your creations become part of a living, evolving masterpiece.
            </p>
          </div>
          
          <div className="space-y-1">
            <h4 className="font-medium text-sm">How to Paint</h4>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              <li>• Paint near screen edges to automatically move around the canvas</li>
              <li>• Click/tap and drag to paint with the selected brush</li>
              <li>• Choose colors with the color picker</li>
              <li>• Switch between brush and eraser tools in the toolbar</li>
              <li>• Adjust brush size from 1-20 pixels</li>
              <li>• Sessions last 60 minutes with 5 minute inactivity timeout</li>
            </ul>
          </div>
          
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Rules & Guidelines</h4>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              <li>• Maximum 100 simultaneous painters</li>
              <li>• Queue system when room is full</li>
              <li>• All artwork is public and permanent</li>
              <li>• No login required - completely anonymous</li>
              <li>• Real-time collaboration with other painters</li>
            </ul>
          </div>
          
          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            <p>
              Questions? Contact: <span className="text-primary">info@pascalsender.com</span>
            </p>
            <p className="mt-1">
              No personal data is collected. Your position and UI preferences are stored locally only.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InfoDialog;