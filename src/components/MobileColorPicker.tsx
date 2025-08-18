import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface MobileColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MobileColorPicker = ({ color, onColorChange, isOpen, onClose }: MobileColorPickerProps) => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [value, setValue] = useState(50);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent-colors');
    return saved ? JSON.parse(saved) : ['#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff'];
  });
  
  const wheelRef = useRef<HTMLCanvasElement>(null);

  // Convert hex to HSV
  const hexToHsv = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6;
      else if (max === g) h = (b - r) / diff + 2;
      else h = (r - g) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : Math.round((diff / max) * 100);
    const v = Math.round(max * 100);
    
    return { h, s, v };
  }, []);

  // Convert HSV to hex
  const hsvToHex = useCallback((h: number, s: number, v: number) => {
    const hh = h / 60;
    const ss = s / 100;
    const vv = v / 100;
    
    const c = vv * ss;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    const m = vv - c;
    
    let r = 0, g = 0, b = 0;
    
    if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
    else if (hh >= 1 && hh < 2) { r = x; g = c; b = 0; }
    else if (hh >= 2 && hh < 3) { r = 0; g = c; b = x; }
    else if (hh >= 3 && hh < 4) { r = 0; g = x; b = c; }
    else if (hh >= 4 && hh < 5) { r = x; g = 0; b = c; }
    else if (hh >= 5 && hh < 6) { r = c; g = 0; b = x; }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  // Initialize HSV from current color
  useEffect(() => {
    if (color) {
      const { h, s, v } = hexToHsv(color);
      setHue(h);
      setSaturation(s);
      setValue(v);
    }
  }, [color, hexToHsv]);

  // Draw color wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = 200;
    const center = size / 2;
    const radius = center - 4;
    
    canvas.width = size;
    canvas.height = size;
    
    // Draw hue wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      ctx.beginPath();
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = 30;
      ctx.stroke();
    }
    
    // Draw saturation gradient
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius - 15);
    gradient.addColorStop(0, `hsl(${hue}, 0%, ${value}%)`);
    gradient.addColorStop(1, `hsl(${hue}, 100%, ${value}%)`);
    
    ctx.beginPath();
    ctx.arc(center, center, radius - 15, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [hue, value]);

  const handleWheelTouch = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left - 100; // center offset
    const y = clientY - rect.top - 100;
    
    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    const normalizedAngle = angle < 0 ? angle + 360 : angle;
    
    if (distance > 55 && distance < 96) {
      // Touched on hue ring
      setHue(normalizedAngle);
    } else if (distance < 55) {
      // Touched inside for saturation
      const sat = Math.min(100, (distance / 55) * 100);
      setSaturation(sat);
    }
  }, []);

  // Update color when HSV changes (debounced to prevent glitching)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const newColor = hsvToHex(hue, saturation, value);
      onColorChange(newColor);
      
      // Add to recent colors (keep last 5 unique)
      setRecentColors(prev => {
        const updated = [newColor, ...prev.filter(c => c !== newColor)].slice(0, 5);
        localStorage.setItem('recent-colors', JSON.stringify(updated));
        return updated;
      });
    }, 50);
    
    return () => clearTimeout(timeout);
  }, [hue, saturation, value, hsvToHex, onColorChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-6 m-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Choose Color</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Color wheel */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={wheelRef}
            className="cursor-pointer rounded-lg touch-none"
            onMouseDown={handleWheelTouch}
            onTouchStart={handleWheelTouch}
          />
        </div>

        {/* Value slider */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Brightness:</span>
            <input
              type="range"
              min="10"
              max="90"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-mono w-8">{value}</span>
          </div>
        </div>

        {/* Current color preview */}
        <div
          className="w-full h-12 rounded border border-border mb-4"
          style={{ backgroundColor: color }}
        />

        {/* Recent colors */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">Recent Colors:</div>
          <div className="grid grid-cols-5 gap-2">
            {recentColors.map((recentColor, index) => (
              <button
                key={index}
                className="w-12 h-12 rounded-lg border-2 border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: recentColor }}
                onClick={() => {
                  const { h, s, v } = hexToHsv(recentColor);
                  setHue(h);
                  setSaturation(s);
                  setValue(v);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileColorPicker;