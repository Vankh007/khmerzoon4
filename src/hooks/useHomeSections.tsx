import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HomeSection {
  id: string;
  section_key: string;
  section_name: string;
  is_visible: boolean;
  display_order: number;
}

export const useHomeSections = () => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching home sections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const isVisible = (sectionKey: string): boolean => {
    const section = sections.find(s => s.section_key === sectionKey);
    return section?.is_visible ?? true;
  };

  const updateVisibility = async (sectionKey: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('home_sections')
        .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
        .eq('section_key', sectionKey);

      if (error) throw error;
      
      setSections(prev => 
        prev.map(s => s.section_key === sectionKey ? { ...s, is_visible: isVisible } : s)
      );
      return true;
    } catch (error) {
      console.error('Error updating section visibility:', error);
      return false;
    }
  };

  return { sections, loading, isVisible, updateVisibility, refetch: fetchSections };
};
