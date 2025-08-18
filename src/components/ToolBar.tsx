import { PaintState, Tool } from '@/pages/Index';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Brush, Eraser, Play, Info } from 'lucide-react';

interface ToolBarProps {
  paintState: PaintState;
  setPaintState: React.Dispatch<React.SetStateAction<PaintState>>;
  onInfoOpen: () => void;
  onPlayOpen: () => void;
  strokeCount: number;
}

const ToolBar = ({ paintState, setPaintState, onInfoOpen, onPlayOpen, strokeCount }: ToolBarProps) => {
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

        {/* Size control */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <span className="text-sm text-muted-foreground">Size:</span>
          <div className="flex-1">
            <Slider
              value={[paintState.size]}
              onValueChange={(values) => handleSizeChange(values[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          <span className="text-sm font-medium w-6 text-center">{paintState.size}</span>
        </div>

        {/* Size preview */}
        <div className="flex items-center justify-center w-8 h-8">
          <div
            className="rounded-full border border-border"
            style={{
              width: `${Math.max(2, paintState.size)}px`,
              height: `${Math.max(2, paintState.size)}px`,
              backgroundColor: paintState.tool === 'eraser' ? 'transparent' : paintState.color,
              borderStyle: paintState.tool === 'eraser' ? 'dashed' : 'solid'
            }}
          />
        </div>

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