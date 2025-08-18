interface EdgeIndicatorsProps {
  worldX: number;
  worldY: number;
  worldSize: number;
  viewportSize: number;
}

const EdgeIndicators = ({ worldX, worldY, worldSize, viewportSize }: EdgeIndicatorsProps) => {
  const isNearLeftEdge = worldX <= 50;
  const isNearRightEdge = worldX >= worldSize - viewportSize - 50;
  const isNearTopEdge = worldY <= 50;
  const isNearBottomEdge = worldY >= worldSize - viewportSize - 50;

  const isAtLeftEdge = worldX <= 0;
  const isAtRightEdge = worldX >= worldSize - viewportSize;
  const isAtTopEdge = worldY <= 0;
  const isAtBottomEdge = worldY >= worldSize - viewportSize;

  return (
    <>
      {/* Left edge indicators */}
      {isNearLeftEdge && (
        <div 
          className={`absolute left-0 top-0 w-2 h-full ${
            isAtLeftEdge ? 'bg-red-600' : 'bg-red-300'
          } opacity-80`}
        />
      )}
      
      {/* Right edge indicators */}
      {isNearRightEdge && (
        <div 
          className={`absolute right-0 top-0 w-2 h-full ${
            isAtRightEdge ? 'bg-red-600' : 'bg-red-300'
          } opacity-80`}
        />
      )}
      
      {/* Top edge indicators */}
      {isNearTopEdge && (
        <div 
          className={`absolute top-0 left-0 w-full h-2 ${
            isAtTopEdge ? 'bg-red-600' : 'bg-red-300'
          } opacity-80`}
        />
      )}
      
      {/* Bottom edge indicators */}
      {isNearBottomEdge && (
        <div 
          className={`absolute bottom-0 left-0 w-full h-2 ${
            isAtBottomEdge ? 'bg-red-600' : 'bg-red-300'
          } opacity-80`}
        />
      )}
    </>
  );
};

export default EdgeIndicators;