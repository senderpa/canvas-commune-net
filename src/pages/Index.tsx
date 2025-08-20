import { useState, useEffect, useCallback, useRef } from 'react';
import WorldCanvas from '@/components/WorldCanvas';
import PaintToolbar from '@/components/PaintToolbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePlayerSession } from '@/hooks/usePlayerSession';
import EmojiSelectionOverlay from '@/components/EmojiSelectionOverlay';
import WorldMinimap from '@/components/WorldMinimap';
import { supabase } from '@/integrations/supabase/client';
import { useWindowSize } from 'usehooks-ts';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush';
  timestamp: number;
}

export interface PaintState {
  x: number;
  y: number;
  tool: 'brush';
  color: string;
  size: number;
}

const Index = () => {
  const [paintState, setPaintState] = useState<PaintState>({
    x: 0,
    y: 0,
    tool: 'brush',
    color: '#000000',
    size: 5,
  });

  const [showWelcome, setShowWelcome] = useState(true);
  const [showEmojiSelection, setShowEmojiSelection] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    sessionState,
    joinSession,
    leaveSession,
    updatePosition,
    updatePaintState,
    checkCollisions,
    resetKick,
  } = usePlayerSession();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [lastStrokeX, setLastStrokeX] = useState(5000);
  const [lastStrokeY, setLastStrokeY] = useState(5000);
  const [strokeCount, setStrokeCount] = useState(0);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStrokesLoading, setIsStrokesLoading] = useState(false);
  const [strokesError, setStrokesError] = useState<Error | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [canJoin, setCanJoin] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [isKicked, setIsKicked] = useState(false);
  const [kickReason, setKickReason] = useState<'timeout' | 'inactivity' | 'full' | 'disconnected' | 'collision' | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentPlayerEmoji, setCurrentPlayerEmoji] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isFirstStroke, setIsFirstStroke] = useState(true);
  const [isEmojiSelected, setIsEmojiSelected] = useState(false);
  const [isEmojiSelectionComplete, setIsEmojiSelectionComplete] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [emojiSelection, setEmojiSelection] = useState<string[]>([]);
  const [isEmojiSelectionOverlayOpen, setIsEmojiSelectionOverlayOpen] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isEmojiPickerReady, setIsEmojiPickerReady] = useState(false);
  const [isEmojiPickerLoading, setIsEmojiPickerLoading] = useState(false);
  const [isEmojiPickerError, setIsEmojiPickerError] = useState(false);
  const [isEmojiPickerSuccess, setIsEmojiPickerSuccess] = useState(false);
	const [isEmojiPickerDisabled, setIsEmojiPickerDisabled] = useState(false);
	const [isEmojiPickerEnabled, setIsEmojiPickerEnabled] = useState(true);
	const [isEmojiPickerAvailable, setIsEmojiPickerAvailable] = useState(true);
	const [isEmojiPickerLoadingComplete, setIsEmojiPickerLoadingComplete] = useState(true);
	const [isEmojiPickerLoadingError, setIsEmojiPickerLoadingError] = useState(false);
	const [isEmojiPickerLoadingSuccess, setIsEmojiPickerLoadingSuccess] = useState(true);
	const [isEmojiPickerLoadingDisabled, setIsEmojiPickerLoadingDisabled] = useState(false);
	const [isEmojiPickerLoadingEnabled, setIsEmojiPickerLoadingEnabled] = useState(true);
	const [isEmojiPickerLoadingAvailable, setIsEmojiPickerLoadingAvailable] = useState(true);
	const [isEmojiPickerLoadingCompleteError, setIsEmojiPickerLoadingCompleteError] = useState(false);
	const [isEmojiPickerLoadingCompleteSuccess, setIsEmojiPickerLoadingCompleteSuccess] = useState(true);
	const [isEmojiPickerLoadingCompleteDisabled, setIsEmojiPickerLoadingCompleteDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteEnabled, setIsEmojiPickerLoadingCompleteEnabled] = useState(true);
	const [isEmojiPickerLoadingCompleteAvailable, setIsEmojiPickerLoadingCompleteAvailable] = useState(true);
	const [isEmojiPickerLoadingCompleteErrorSuccess, setIsEmojiPickerLoadingCompleteErrorSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorDisabled, setIsEmojiPickerLoadingCompleteErrorDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorEnabled, setIsEmojiPickerLoadingCompleteErrorEnabled] = useState(true);
	const [isEmojiPickerLoadingCompleteErrorAvailable, setIsEmojiPickerLoadingCompleteErrorAvailable] = useState(true);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessEnabled] = useState(true);
	const [isEmojiPickerLoadingCompleteErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessAvailable] = useState(true);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableComplete, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableComplete] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteError, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteError] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableComplete, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableComplete] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableError, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableError] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableComplete, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableComplete] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableError, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableError] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableComplete, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableComplete] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableError, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableError] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableComplete, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableComplete] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableError, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableError] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableSuccess, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableSuccess] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessDisabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessDisabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessEnabled] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessAvailable, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessAvailable] = useState(false);
	const [isEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessDisabledEnabled, setIsEmojiPickerLoadingCompleteErrorSuccessDisabledEnabledAvailableCompleteErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessDisabledEnabledAvailableErrorSuccessAvailableDisabledEnabledAvailableErrorSuccessDisabledAvailableErrorSuccessDisabledEnabled] = useState(false);
  const windowSize = useWindowSize();

  useEffect(() => {
    setIsMobile(windowSize.width < 768);
  }, [windowSize.width]);

  const handleStartPainting = () => {
    setShowWelcome(false);
    setShowEmojiSelection(true);
  };

  const handleEmojiSelect = async (emoji: string) => {
    setShowEmojiSelection(false);
    const success = await joinSession(emoji);
    if (!success) {
      setShowWelcome(true);
    }
  };

  const handleMove = useCallback(
    async (deltaX: number, deltaY: number) => {
      const newX = paintState.x + deltaX;
      const newY = paintState.y + deltaY;

      setPaintState((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));

      updatePosition(newX, newY);
      setLastStrokeX(newX);
      setLastStrokeY(newY);
    },
    [paintState.x, paintState.y, updatePosition]
  );

  const handleStroke = useCallback(
    async (stroke: Omit<Stroke, 'id' | 'timestamp'>) => {
      if (!sessionState.isConnected) {
        toast({
          title: 'Not connected',
          description: 'Please connect to the server to draw',
        });
        return;
      }

      const newStroke = {
        ...stroke,
        id: Math.random().toString(36).substring(2),
        timestamp: Date.now(),
      };

      setStrokes((prev) => [...prev, newStroke]);
      setStrokeCount((prev) => prev + 1);
      setLastStrokeX(stroke.points[stroke.points.length - 1].x);
      setLastStrokeY(stroke.points[stroke.points.length - 1].y);
    },
    [sessionState.isConnected, toast]
  );

  useEffect(() => {
    if (sessionState.isConnected) {
      setCurrentPlayerId(sessionState.playerId);
      setCurrentPlayerEmoji(sessionState.selectedEmoji);
    }
  }, [sessionState.isConnected, sessionState.playerId, sessionState.selectedEmoji]);

  useEffect(() => {
    if (sessionState.isKicked) {
      toast({
        title: 'Kicked',
        description: `You were kicked from the server. Reason: ${sessionState.kickReason}`,
      });
    }
  }, [sessionState.isKicked, sessionState.kickReason, toast]);

  useEffect(() => {
    if (sessionState.isConnected) {
      updatePaintState(paintState.color, paintState.tool, paintState.size);
    }
  }, [paintState.color, paintState.tool, paintState.size, sessionState.isConnected, updatePaintState]);

  // Show welcome screen with selected emoji in title
  if (showWelcome) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center space-y-8 max-w-md mx-auto">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome {sessionState.selectedEmoji || ''} to MultiPainteR
            </h1>
            <p className="text-muted-foreground text-lg">
              A collaborative infinite canvas where creativity meets community
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleStartPainting}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg text-lg"
            >
              Start Painting
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${sessionState.isConnected ? 'bg-green-500' : 'bg-muted'}`} />
              <span>{sessionState.playerCount} painters online</span>
              {sessionState.queueCount > 0 && (
                <span className="text-amber-500">• {sessionState.queueCount} in queue</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Emoji selection overlay
  if (showEmojiSelection) {
    return (
      <EmojiSelectionOverlay onEmojiSelect={handleEmojiSelect} />
    );
  }

  // Kicked overlay
  if (sessionState.isKicked) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold mb-4">You were kicked!</h1>
          <p className="text-muted-foreground mb-6">
            Reason: {sessionState.kickReason}
          </p>
          <Button onClick={() => {
            resetKick();
            setShowWelcome(true);
          }} className="w-full">
            Back to Welcome Screen
          </Button>
        </div>
      </div>
    );
  }

  // Queue overlay
  if (sessionState.queuePosition > 0 && !sessionState.isConnected) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold mb-4">You are in the queue!</h1>
          <p className="text-muted-foreground mb-6">
            Position: {sessionState.queuePosition}
          </p>
          <p className="text-muted-foreground mb-6">
            Please wait, you will be connected automatically.
          </p>
        </div>
      </div>
    );
  }

  // Main painting interface
  return (
    <>
      <PaintToolbar
        paintState={paintState}
        onPaintStateChange={setPaintState}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
      />

      <WorldCanvas
        paintState={paintState}
        strokes={strokes}
        onMove={handleMove}
        onStroke={handleStroke}
        strokeCount={strokeCount}
        playerCount={sessionState.playerCount}
        isConnected={sessionState.isConnected}
        currentPlayerEmoji={currentPlayerEmoji}
        currentPlayerId={currentPlayerId}
      />

      {showMinimap && (
        <WorldMinimap
          worldX={paintState.x}
          worldY={paintState.y}
          lastStrokeX={lastStrokeX}
          lastStrokeY={lastStrokeY}
          strokes={strokes}
          currentPlayerId={currentPlayerId}
          currentPlayerEmoji={currentPlayerEmoji}
          onClose={() => setShowMinimap(false)}
        />
      )}
    </>
  );
};

export default Index;
