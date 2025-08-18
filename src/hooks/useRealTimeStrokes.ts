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

  // Add a new stroke
  const addStroke = useCallback(async (strokeInput: StrokeInput) => {
    try {
      console.log('Adding stroke to database:', strokeInput);
      
      const { data, error } = await supabase
        .from('strokes')
        .insert(strokeInput)
        .select()
        .single();

      if (error) {
        console.error('Error adding stroke:', error);
        return null;
      }

      console.log('Stroke added successfully:', data);
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
          setStrokes(prev => {
            console.log('Adding stroke to state, current count:', prev.length);
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