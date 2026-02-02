import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MovieCard from './MovieCard';
import { Skeleton } from './ui/skeleton';

interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  thumbnail?: string;
  content_type?: 'movie' | 'series' | 'anime';
  genre?: string;
  tmdb_id?: number;
  cast_members?: string;
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
}

interface TopAnimesSectionProps {
  className?: string;
}

const TopAnimesSection = ({ className }: TopAnimesSectionProps = {}) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (item: Content): string | null => {
    return item.poster_path || item.backdrop_path || null;
  };

  useEffect(() => {
    const fetchTopAnimes = async () => {
      setLoading(true);
      try {
        // Get all content IDs that are in upcoming_releases with status='upcoming'
        const { data: upcomingData } = await supabase
          .from('upcoming_releases')
          .select('content_id')
          .eq('status', 'upcoming')
          .not('content_id', 'is', null);

        const upcomingContentIds = upcomingData?.map(item => item.content_id).filter(Boolean) || [];

        // Query anime content - only select needed fields for faster loading
        let query = supabase
          .from('content')
          .select('id, title, overview, poster_path, backdrop_path, genre, tmdb_id, cast_members, access_type, recent_episode, content_type')
          .eq('content_type', 'anime')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);

        // Exclude upcoming content if there are any
        if (upcomingContentIds.length > 0) {
          query = query.not('id', 'in', `(${upcomingContentIds.join(',')})`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setContent(data || []);
      } catch (error) {
        console.error('Error fetching top animes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopAnimes();
  }, []);

  const handleCardClick = (item: Content) => {
    if (item.tmdb_id) {
      navigate(`/watch/anime/${item.tmdb_id}/1/1`);
    } else {
      navigate(`/watch/${item.id}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-32 w-64" />
          <Skeleton className="h-8 w-32 ml-auto" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-44 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!content.length) {
    return null;
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        {/* Large "TOP" text */}
        <h2 className="text-6xl md:text-7xl lg:text-8xl font-black text-primary leading-none">
          TOP
        </h2>
        {/* Category text and See all */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col justify-center">
            <p className="text-lg md:text-xl font-semibold text-foreground uppercase tracking-wide">
              ANIMES
            </p>
            <p className="text-lg md:text-xl font-semibold text-foreground uppercase tracking-wide">
              TODAY
            </p>
          </div>
          <button
            onClick={() => navigate('/series?type=anime')}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-sm md:text-base group ml-2"
          >
            See all
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Content Row */}
      <div className="relative">
        <div className="flex gap-3 md:gap-4 xl:gap-6 overflow-x-auto scrollbar-hide pb-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-44 md:w-48 xl:w-56 2xl:w-60 cursor-pointer"
              onClick={() => handleCardClick(item)}
            >
              <MovieCard
                id={item.id}
                title={item.title}
                description={item.overview || ''}
                imageUrl={getImageUrl(item)}
                category={item.genre}
                castNames={item.cast_members}
                accessType={item.access_type}
                recentEpisode={item.recent_episode}
                onClick={() => handleCardClick(item)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopAnimesSection;
