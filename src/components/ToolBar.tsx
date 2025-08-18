import { PaintState, Tool } from '@/pages/Index';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Brush, Eraser, Play, Info } from 'lucide-react';

interface ToolBarProps {
  paintState: PaintState;
  setPaintState: React.Dispatch<React.SetStateAction<PaintState>>;
  onInfoOpen: () => void;
  onPlayOpen: () => void;
  onMapOpen: () => void;
  strokeCount: number;
}

const ToolBar = ({ paintState, setPaintState, onInfoOpen, onPlayOpen, onMapOpen, strokeCount }: ToolBarProps) => {
  const handleToolChange = (tool: Tool) => {
    setPaintState(prev => ({ ...prev, tool }));
  };

  const handleSizeChange = (size: number) => {
    setPaintState(prev => ({ ...prev, size }));
  };

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl">
      <div className="flex items-center gap-4">
        {/* Tool selection */}
        <div className="flex gap-2">
          <Button
            variant={paintState.tool === 'brush' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => handleToolChange('brush')}
            className="gap-2"
          >
            <Brush className="w-4 h-4" />
            Brush
          </Button>
          
          <Button
            variant={paintState.tool === 'eraser' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => handleToolChange('eraser')}
            className="gap-2"
          >
            <Eraser className="w-4 h-4" />
            Eraser
          </Button>
        </div>


        {/* Map button */}
        <Button 
          onClick={onMapOpen}
          variant="outline" 
          size="sm"
        >
          🗺️ Map
        </Button>

        {/* Animation button */}
        <Button 
          onClick={onPlayOpen}
          variant="outline" 
          size="sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Animation ({strokeCount})
        </Button>
        
        <Button onClick={onInfoOpen} variant="outline" size="sm">
          <Info className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ToolBar;