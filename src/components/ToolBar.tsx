import { PaintState, Tool } from '@/pages/Index';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Brush, Play, Info, X } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

interface ToolBarProps {
  paintState: PaintState;
  setPaintState: React.Dispatch<React.SetStateAction<PaintState>>;
  onInfoOpen: () => void;
  onPlayOpen: () => void;
  onMapOpen: () => void;
  strokeCount: number;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
}

const ToolBar = ({ paintState, setPaintState, onInfoOpen, onPlayOpen, onMapOpen, strokeCount, onColorChange, onSizeChange }: ToolBarProps) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [autoMove, setAutoMove] = useState<{ [key: string]: boolean }>({ size: false, brightness: false, opacity: false });
  const [clickCounts, setClickCounts] = useState<{ [key: string]: number }>({});
  const [clickTimestamps, setClickTimestamps] = useState<{ [key: string]: number[]}>({});
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const [sliderValues, setSliderValues] = useState({
    size: paintState.size,
    brightness: 50,
    opacity: 100
  });

  const handleSizeChange = (size: number) => {
    setPaintState(prev => ({ ...prev, size }));
    setSliderValues(prev => ({ ...prev, size }));
    onSizeChange(size);
  };

  // Handle triple-click auto-move for sliders
  const handleSliderClick = useCallback((sliderType: 'size' | 'brightness' | 'opacity') => {
    const now = Date.now();
    const key = sliderType;
    
    // Update click timestamps
    setClickTimestamps(prev => {
      const timestamps = [...(prev[key] || []), now];
      // Keep only recent clicks (within 1 second)
      const recentTimestamps = timestamps.filter(ts => now - ts < 1000);
      
      if (recentTimestamps.length >= 3) {
        // Triple click detected - start auto movement
        setAutoMove(prev => ({ ...prev, [key]: true }));
        
        // Clear existing interval
        if (intervalRefs.current[key]) {
          clearInterval(intervalRefs.current[key]!);
        }
        
        let increasing = true;
        let currentValue = sliderValues[key];
        
        intervalRefs.current[key] = setInterval(() => {
          setSliderValues(prev => {
            const step = sliderType === 'size' ? 0.5 : 1;
            const min = sliderType === 'size' ? 1 : 0;
            const max = sliderType === 'size' ? 50 : 100;
            
            if (increasing) {
              currentValue += step;
              if (currentValue >= max) {
                currentValue = max;
                increasing = false;
              }
            } else {
              currentValue -= step;
              if (currentValue <= min) {
                currentValue = min;
                increasing = true;
              }
            }
            
            // Update paint state for size
            if (sliderType === 'size') {
              setPaintState(prevPaint => ({ ...prevPaint, size: currentValue }));
              onSizeChange(currentValue);
            }
            
            return { ...prev, [key]: currentValue };
          });
        }, 1000); // 100 seconds for full cycle = 1000ms per step
        
        return {};
      }
      
      return { ...prev, [key]: recentTimestamps };
    });
  }, [sliderValues, setPaintState, onSizeChange]);

  // Handle single click to stop auto-move
  const handleSliderSingleClick = useCallback((sliderType: 'size' | 'brightness' | 'opacity') => {
    if (autoMove[sliderType]) {
      setAutoMove(prev => ({ ...prev, [sliderType]: false }));
      if (intervalRefs.current[sliderType]) {
        clearInterval(intervalRefs.current[sliderType]!);
        intervalRefs.current[sliderType] = null;
      }
    } else {
      // Check for triple click
      handleSliderClick(sliderType);
    }
  }, [autoMove, handleSliderClick]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  return (
    <>
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl">
        <div className="flex items-center gap-4">
          {/* Brush button with color indicator */}
          <button
            onClick={() => setIsColorPickerOpen(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded hover:bg-muted"
          >
            <div className="relative">
              <Brush className="w-4 h-4" />
              <div
                className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-background"
                style={{ backgroundColor: paintState.color }}
              />
            </div>
            Brush
          </button>

          {/* Size slider with auto-move */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Size:</span>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="50"
                value={sliderValues.size}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                onClick={() => handleSliderSingleClick('size')}
                className={`w-16 h-2 bg-muted rounded-lg appearance-none cursor-pointer ${autoMove.size ? 'animate-pulse' : ''}`}
              />
              {autoMove.size && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs w-6 text-center">{Math.round(sliderValues.size)}</span>
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

      {/* Desktop Color Picker Overlay */}
      {isColorPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="animate-scale-in">
            <div className="bg-card border border-border rounded-lg p-4 shadow-xl relative">
              <button
                onClick={() => setIsColorPickerOpen(false)}
                className="absolute top-2 right-2 p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="pr-8">
                {/* Mini Color Picker */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Choose Color</h3>
                  
                  {/* Current color display */}
                  <div
                    className="w-full h-8 rounded border border-border"
                    style={{ backgroundColor: paintState.color }}
                  />
                  
                  {/* Quick colors */}
                  <div className="grid grid-cols-8 gap-1">
                    {['#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff', '#ff0040', '#40ff00', '#0040ff',
                      '#ff3366', '#33ff66', '#3366ff', '#ff6b35', '#7b68ee', '#ff1493', '#00bfff', '#32cd32'].map((quickColor) => (
                      <button
                        key={quickColor}
                        className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: quickColor }}
                        onClick={() => {
                          onColorChange(quickColor);
                          setIsColorPickerOpen(false);
                        }}
                      />
                    ))}
                  </div>

                  {/* Brightness slider with auto-move */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Brightness:</span>
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderValues.brightness}
                        onChange={(e) => setSliderValues(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                        onClick={() => handleSliderSingleClick('brightness')}
                        className={`w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer ${autoMove.brightness ? 'animate-pulse' : ''}`}
                      />
                      {autoMove.brightness && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs w-8 text-center">{Math.round(sliderValues.brightness)}%</span>
                  </div>

                  {/* Opacity slider with auto-move */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Opacity:</span>
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderValues.opacity}
                        onChange={(e) => setSliderValues(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                        onClick={() => handleSliderSingleClick('opacity')}
                        className={`w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer ${autoMove.opacity ? 'animate-pulse' : ''}`}
                      />
                      {autoMove.opacity && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs w-8 text-center">{Math.round(sliderValues.opacity)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ToolBar;