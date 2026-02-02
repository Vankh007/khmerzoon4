import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import GridMovieCard from '@/components/GridMovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ViralTop10Card from '@/components/viral/ViralTop10Card';
import ViralShortCard from '@/components/viral/ViralShortCard';
import ViralStatsSection from '@/components/viral/ViralStatsSection';

interface CastMember {
  id: string;
  profile_path: string;
  name?: string;
}

interface Content {
  id: string;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  content_type: string;
  overview: string | null;
  release_date: string | null;
  popularity: number | null;
  tmdb_id: number | null;
  genre?: string;
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
  cast?: CastMember[];
}

interface Short {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  views: number;
  description: string | null;
  created_at: string;
}

const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';

// Fetch cast member profile images from TMDB
const fetchCastWithImages = async (tmdbId: number, isMovie: boolean): Promise<CastMember[]> => {
  try {
    const mediaType = isMovie ? 'movie' : 'tv';
    const response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const cast = data.cast || [];
    
    // Return top 5 cast members with images
    return cast.slice(0, 5).map((member: any) => ({
      id: member.id.toString(),
      profile_path: member.profile_path,
      name: member.name
    }));
  } catch (error) {
    console.error('Error fetching cast images:', error);
    return [];
  }
};

const Viral = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [trendingContent, setTrendingContent] = useState<Content[]>([]);
  const [viralShorts, setViralShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    fetchViralContent();
  }, []);

  const fetchViralContent = async () => {
    setIsLoading(true);
    try {
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id, title, poster_path, backdrop_path, content_type, overview, release_date, popularity, tmdb_id, genre, access_type, recent_episode')
        .order('popularity', { ascending: false })
        .limit(20);

      if (contentError) throw contentError;
      
      // Fetch cast images from TMDB for each content item
      if (contentData) {
        const contentWithCast = await Promise.all(
          contentData.map(async (item) => {
            let castMembers: CastMember[] = [];
            
            // If we have tmdb_id, fetch cast from TMDB API
            if (item.tmdb_id) {
              const isMovie = item.content_type === 'movie';
              castMembers = await fetchCastWithImages(item.tmdb_id, isMovie);
            }
            
            return {
              ...item,
              cast: castMembers
            };
          })
        );
        
        setTrendingContent(contentWithCast);
      }

      const { data: shortsData, error: shortsError } = await supabase
        .from('shorts')
        .select('id, title, thumbnail_url, video_url, views, description, created_at')
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(12);

      if (shortsError) throw shortsError;
      if (shortsData) setViralShorts(shortsData);
    } catch (error) {
      console.error('Error fetching viral content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentClick = (content: Content) => {
    const type = content.content_type === 'movie' ? 'movie' : 'series';
    const id = content.tmdb_id || content.id;
    navigate(`/watch/${type}/${id}`);
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const top10Content = trendingContent.slice(0, 10);
  const restContent = trendingContent.slice(10);

  const heroBackdrop = top10Content[0]?.backdrop_path;

  const renderTop10Skeleton = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 ml-10">
          <Skeleton className="w-[280px] md:w-[400px] lg:w-[480px] aspect-video rounded-xl" />
        </div>
      ))}
    </div>
  );

  const renderGridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
      ))}
    </div>
  );

  const renderShortsSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-[280px] md:h-[360px] lg:h-[420px] overflow-hidden">
        {heroBackdrop && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
            style={{ 
              backgroundImage: `url(${heroBackdrop.startsWith('http') ? heroBackdrop : `https://image.tmdb.org/t/p/original${heroBackdrop}`})`,
              filter: 'blur(2px)',
            }}
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_70%)]" />
        
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="max-w-2xl space-y-4 md:space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full backdrop-blur-sm border border-primary/30">
                <Flame className="w-5 h-5 text-primary animate-pulse" />
                <span className="text-sm font-semibold text-primary">{t('viral') || 'Trending Now'}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
                Trending & <span className="text-primary">Viral</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-lg">
                Discover the most popular and viral content that everyone is watching right now
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Horizontal Scroll Section */}
      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                Top 10 This Week
              </h2>
            </div>
            <button 
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setActiveTab('trending')}
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {isLoading ? (
          renderTop10Skeleton()
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-4 md:gap-6 px-4 md:px-6 lg:px-8 pb-4">
              {top10Content.map((content, index) => (
                <ViralTop10Card 
                  key={content.id} 
                  content={content} 
                  rank={index + 1} 
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-2" />
          </ScrollArea>
        )}
      </section>

      {/* Tabs Section */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-md h-12 mb-6 md:mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="trending" 
              className="flex-1 h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="font-medium">All Trending</span>
            </TabsTrigger>
            <TabsTrigger 
              value="shorts" 
              className="flex-1 h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Flame className="w-4 h-4 mr-2" />
              <span className="font-medium">Viral Shorts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="mt-0">
            {isLoading ? (
              renderGridSkeleton()
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {trendingContent.map((content) => (
                  <GridMovieCard
                    key={content.id}
                    item={{
                      id: content.id,
                      title: content.title,
                      poster_path: content.poster_path || undefined,
                      backdrop_path: content.backdrop_path || undefined,
                      overview: content.overview || undefined,
                      genre: content.genre || undefined,
                      tmdb_id: content.tmdb_id || undefined,
                      cast: content.cast,
                      content_type: content.content_type,
                      access_type: content.access_type,
                      recent_episode: content.recent_episode || undefined
                    }}
                    onClick={() => handleContentClick(content)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shorts" className="mt-0">
            {isLoading ? (
              renderShortsSkeleton()
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {viralShorts.map((short, index) => (
                  <ViralShortCard
                    key={short.id}
                    short={short}
                    rank={index + 1}
                    formatViews={formatViews}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Stats Section */}
      {!isLoading && (
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
          <ViralStatsSection
            trendingCount={trendingContent.length}
            shortsCount={viralShorts.length}
            totalViews={viralShorts.reduce((sum, s) => sum + s.views, 0)}
            formatViews={formatViews}
          />
        </section>
      )}
    </div>
  );
};

export default Viral;
