import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Stroke {
  id: string;
  player_id: string;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  created_at: string;
  world_x: number;
  world_y: number;
}

interface StrokeInput {
  player_id: string;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  world_x: number;
  world_y: number;
  session_token?: string;
}

export const useRealTimeStrokes = () => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing strokes
  const loadStrokes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('strokes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading strokes:', error);
        return;
      }

      setStrokes((data || []).map(stroke => ({
        ...stroke,
        points: stroke.points as { x: number; y: number; pressure?: number }[],
        tool: stroke.tool as 'brush' | 'eraser'
      })));
    } catch (error) {
      console.error('Error loading strokes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new stroke with security validation
  const addStroke = useCallback(async (strokeInput: StrokeInput) => {
    try {
      console.log('Adding stroke to database with validation:', strokeInput);
      
      // Client-side validation first (basic checks)
      if (!strokeInput.player_id || !strokeInput.points || strokeInput.points.length === 0) {
        console.error('Invalid stroke input: missing required fields');
        return null;
      }
      
      // Validate coordinates are within reasonable bounds
      if (strokeInput.world_x < 0 || strokeInput.world_x > 50000 || 
          strokeInput.world_y < 0 || strokeInput.world_y > 50000) {
        console.error('Invalid stroke coordinates');
        return null;
      }
      
      // Validate points array size (prevent DOS)
      if (strokeInput.points.length > 1000) {
        console.error('Too many points in stroke');
        return null;
      }
      
      // Check rate limiting before proceeding
      const rateLimitCheck = await supabase.rpc('check_rate_limit', {
        p_player_id: strokeInput.player_id,
        p_action_type: 'stroke_create',
        p_max_actions: 60, // Max 60 strokes per minute
        p_window_minutes: 1
      });
      
      if (rateLimitCheck.error || !rateLimitCheck.data) {
        console.error('Rate limit exceeded or check failed');
        return null;
      }
      
      // Server-side input validation
      const validationResult = await supabase.rpc('validate_drawing_input', {
        p_points: strokeInput.points,
        p_world_x: strokeInput.world_x,
        p_world_y: strokeInput.world_y,
        p_size: strokeInput.size,
        p_color: strokeInput.color,
        p_tool: strokeInput.tool
      });
      
      if (validationResult.error || !validationResult.data) {
        console.error('Server validation failed:', validationResult.error);
        return null;
      }
      
      // Add stroke optimistically to local state immediately
      const optimisticStroke: Stroke = {
        id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
        ...strokeInput,
        created_at: new Date().toISOString()
      };
      
      setStrokes(prev => {
        console.log('Adding optimistic stroke to state, current count:', prev.length);
        return [...prev, optimisticStroke];
      });
      
      const { data, error } = await supabase
        .from('strokes')
        .insert(strokeInput)
        .select()
        .single();

      if (error) {
        console.error('Error adding stroke:', error);
        // Remove the optimistic stroke on error
        setStrokes(prev => prev.filter(s => s.id !== optimisticStroke.id));
        return null;
      }

      console.log('Stroke added successfully:', data);
      
      // Replace optimistic stroke with real stroke when database confirms
      setStrokes(prev => prev.map(s => 
        s.id === optimisticStroke.id ? { ...data, points: data.points as { x: number; y: number; pressure?: number }[], tool: data.tool as 'brush' | 'eraser' } as Stroke : s
      ));
      
      return data;
    } catch (error) {
      console.error('Error adding stroke:', error);
      return null;
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    loadStrokes();

    const channel = supabase
      .channel('strokes-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'strokes' },
        (payload) => {
          console.log('Real-time stroke received:', payload.new);
          const newStroke = {
            ...payload.new,
            points: payload.new.points as { x: number; y: number; pressure?: number }[],
            tool: payload.new.tool as 'brush' | 'eraser'
          } as Stroke;
          
          // Only add if not already in state (avoid duplicates from optimistic updates)
          setStrokes(prev => {
            const exists = prev.find(s => s.id === newStroke.id);
            if (exists) {
              console.log('Stroke already exists (optimistic), skipping real-time add');
              return prev;
            }
            console.log('Adding real-time stroke to state, current count:', prev.length);
            return [...prev, newStroke];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'strokes' },
        (payload) => {
          const deletedId = payload.old.id;
          setStrokes(prev => prev.filter(stroke => stroke.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStrokes]);

  return {
    strokes,
    isLoading,
    addStroke,
    refreshStrokes: loadStrokes
  };
};