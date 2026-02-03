import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PinnedSeriesSectionProps {
  className?: string;
}

const PinnedSeriesSection = ({ className }: PinnedSeriesSectionProps) => {
  const { data: pinnedSeries, isLoading } = useQuery({
    queryKey: ['pinned-series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'series')
        .eq('is_pinned', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || !pinnedSeries?.length) return null;

  return (
    <div className={cn("py-4", className)}>
      <div className="px-4 md:px-[15px]">
        <h2 className="text-xl md:text-2xl font-bold mb-4">📌 Pinned Series</h2>
      </div>
      <div className="relative">
        <div className="flex overflow-x-auto gap-3 px-4 md:px-[15px] scrollbar-hide pb-2">
          {pinnedSeries.map((series) => (
            <Link
              key={series.id}
              to={`/watch/series/${series.tmdb_id}`}
              className="flex-shrink-0 group"
            >
              <div className="relative w-[140px] md:w-[160px] overflow-hidden rounded-lg">
                {series.poster_path ? (
                  <img
                    src={series.poster_path}
                    alt={series.title}
                    className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    No Poster
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm font-medium truncate">{series.title}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PinnedSeriesSection;
