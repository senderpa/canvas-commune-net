import { useState, useEffect } from 'react';

const PlayerStats = () => {
  const [stats, setStats] = useState({
    activePlayers: 247,
    sessionStrokes: 0,
    ping: 42,
    saving: false
  });

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activePlayers: 200 + Math.floor(Math.random() * 100),
        ping: 30 + Math.floor(Math.random() * 50),
        saving: Math.random() > 0.8
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <div className="space-y-2 text-sm">
        {/* Active players */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Players:</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-creative-primary rounded-full animate-pulse" />
            <span className="font-medium text-creative-primary">
              {formatNumber(stats.activePlayers)}
            </span>
          </div>
        </div>

        {/* Session strokes */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Strokes:</span>
          <span className="font-medium">{stats.sessionStrokes}</span>
        </div>

        {/* Ping */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Ping:</span>
          <span 
            className={`font-medium ${
              stats.ping < 50 ? 'text-green-400' : 
              stats.ping < 100 ? 'text-yellow-400' : 'text-red-400'
            }`}
          >
            {stats.ping}ms
          </span>
        </div>

        {/* Save status */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-2">
            {stats.saving ? (
              <>
                <div className="w-2 h-2 bg-creative-secondary rounded-full animate-spin" />
                <span className="text-xs text-creative-secondary">Saving...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-xs text-green-400">Synced</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStats;