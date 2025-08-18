import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import Minimap from './Minimap';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface MinimapModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldX: number;
  worldY: number;
  strokes: Stroke[];
}

const MinimapModal = ({ isOpen, onClose, worldX, worldY, strokes }: MinimapModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Complete Artwork View</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <Minimap worldX={worldX} worldY={worldY} strokes={strokes} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MinimapModal;