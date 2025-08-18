import { Tool } from '@/pages/Index';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ToolBarProps {
  tool: Tool;
  size: number;
  onToolChange: (tool: Tool) => void;
  onSizeChange: (size: number) => void;
}

const ToolBar = ({ tool, size, onToolChange, onSizeChange }: ToolBarProps) => {
  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl">
      <div className="flex items-center gap-4">
        {/* Tool selection */}
        <div className="flex gap-2">
          <Button
            variant={tool === 'brush' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onToolChange('brush')}
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Brush
          </Button>
          
          <Button
            variant={tool === 'eraser' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onToolChange('eraser')}
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eraser
          </Button>
        </div>

        {/* Size control */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <span className="text-sm text-muted-foreground">Size:</span>
          <div className="flex-1">
            <Slider
              value={[size]}
              onValueChange={(values) => onSizeChange(values[0])}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
          </div>
          <span className="text-sm font-medium w-6 text-center">{size}</span>
        </div>

        {/* Size preview */}
        <div className="flex items-center justify-center w-8 h-8">
          <div
            className="rounded-full border border-border"
            style={{
              width: `${Math.max(2, size)}px`,
              height: `${Math.max(2, size)}px`,
              backgroundColor: tool === 'eraser' ? 'transparent' : 'currentColor',
              borderStyle: tool === 'eraser' ? 'dashed' : 'solid'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ToolBar;