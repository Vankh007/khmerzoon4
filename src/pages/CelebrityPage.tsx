import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { 
  ArrowLeft, 
  Film, 
  Tv, 
  Star, 
  ExternalLink,
  Instagram,
  Twitter,
  Facebook,
  ChevronDown,
  ChevronUp,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  gender: number;
  popularity: number;
  also_known_as: string[];
  external_ids: {
    imdb_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
    facebook_id: string | null;
  };
  movie_credits: CreditItem[];
  tv_credits: CreditItem[];
  known_for: CreditItem[];
  total_movie_credits: number;
  total_tv_credits: number;
}

interface CreditItem {
  id: number;
  title: string;
  character: string;
  poster_path: string | null;
  release_year: number | null;
  vote_average: number;
  media_type: 'movie' | 'tv';
  episode_count?: number;
}

const CelebrityPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);
  const [creditFilter, setCreditFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  useEffect(() => {
    if (id) {
      fetchPersonData();
    }
  }, [id]);

  const fetchPersonData = async () => {
    try {
      setLoading(true);
      const personId = id;
      
      // Fetch person details
      const detailsRes = await fetch(
        `${TMDB_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,combined_credits`
      );
      
      if (!detailsRes.ok) throw new Error('Failed to fetch person details');
      
      const data = await detailsRes.json();
      
      // Process movie credits
      const movieCredits: CreditItem[] = (data.combined_credits?.cast || [])
        .filter((c: any) => c.media_type === 'movie')
        .map((credit: any) => ({
          id: credit.id,
          title: credit.title || credit.name,
          character: credit.character || '',
          poster_path: credit.poster_path 
            ? `https://image.tmdb.org/t/p/w300${credit.poster_path}`
            : null,
          release_year: credit.release_date 
            ? new Date(credit.release_date).getFullYear()
            : null,
          vote_average: credit.vote_average || 0,
          media_type: 'movie' as const,
        }));
      
      // Process TV credits
      const tvCredits: CreditItem[] = (data.combined_credits?.cast || [])
        .filter((c: any) => c.media_type === 'tv')
        .map((credit: any) => ({
          id: credit.id,
          title: credit.name || credit.title,
          character: credit.character || '',
          poster_path: credit.poster_path 
            ? `https://image.tmdb.org/t/p/w300${credit.poster_path}`
            : null,
          release_year: credit.first_air_date 
            ? new Date(credit.first_air_date).getFullYear()
            : null,
          vote_average: credit.vote_average || 0,
          media_type: 'tv' as const,
          episode_count: credit.episode_count,
        }));
      
      // Known for (top rated)
      const allCredits = [...movieCredits, ...tvCredits];
      const knownFor = allCredits
        .filter(c => c.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 8);
      
      setPerson({
        id: data.id,
        name: data.name,
        biography: data.biography || '',
        birthday: data.birthday,
        deathday: data.deathday,
        place_of_birth: data.place_of_birth,
        profile_path: data.profile_path 
          ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
          : null,
        known_for_department: data.known_for_department || 'Acting',
        gender: data.gender,
        popularity: data.popularity,
        also_known_as: data.also_known_as || [],
        external_ids: {
          imdb_id: data.external_ids?.imdb_id,
          instagram_id: data.external_ids?.instagram_id,
          twitter_id: data.external_ids?.twitter_id,
          facebook_id: data.external_ids?.facebook_id,
        },
        movie_credits: movieCredits,
        tv_credits: tvCredits,
        known_for: knownFor,
        total_movie_credits: movieCredits.length,
        total_tv_credits: tvCredits.length,
      });
    } catch (error) {
      console.error('Error fetching person data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthday: string, deathday?: string | null) => {
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFilteredCredits = () => {
    if (!person) return [];
    
    let allCredits: CreditItem[] = [];
    
    if (creditFilter === 'all') {
      allCredits = [...(person.movie_credits || []), ...(person.tv_credits || [])];
    } else if (creditFilter === 'movie') {
      allCredits = person.movie_credits || [];
    } else {
      allCredits = person.tv_credits || [];
    }
    
    return allCredits.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
  };

  const KnownForCard = ({ item }: { item: CreditItem }) => {
    const handleClick = () => {
      navigate(`/watch/${item.media_type === 'movie' ? 'movie' : 'series'}/${item.id}`);
    };

    return (
      <div
        className="group cursor-pointer flex-shrink-0 w-[120px] md:w-[140px]"
        onClick={handleClick}
      >
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
          {item.poster_path ? (
            <img
              src={item.poster_path}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {item.media_type === 'movie' ? (
                <Film className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Tv className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          )}
          {item.vote_average > 0 && (
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-[10px] text-foreground font-medium">{item.vote_average.toFixed(1)}</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs font-medium text-foreground text-center line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </p>
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 pb-20">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="lg:w-[280px] flex-shrink-0 space-y-4">
                <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                <Skeleton className="h-6 w-24" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="w-32 aspect-[2/3] rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!person) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-24 pb-20 px-4 max-w-[1600px] mx-auto text-center">
          <p className="text-muted-foreground">Celebrity not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const displayName = person.name;
  const profileImage = person.profile_path;
  const biography = person.biography || '';
  const truncatedBio = biography.length > 500 ? biography.slice(0, 500) + '...' : biography;
  const filteredCredits = getFilteredCredits();

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Sidebar - Profile Image & Personal Info */}
            <div className="lg:w-[280px] flex-shrink-0">
              {/* Profile Image */}
              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-4">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-6xl text-muted-foreground">
                      {displayName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {person.external_ids && (
                <div className="flex items-center gap-2 mb-4">
                  {person.external_ids.twitter_id && (
                    <a 
                      href={`https://twitter.com/${person.external_ids.twitter_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                  {person.external_ids.instagram_id && (
                    <a 
                      href={`https://instagram.com/${person.external_ids.instagram_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {person.external_ids.facebook_id && (
                    <a 
                      href={`https://facebook.com/${person.external_ids.facebook_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {person.external_ids.imdb_id && (
                    <a 
                      href={`https://imdb.com/name/${person.external_ids.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Personal Info</h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Known For</p>
                    <p className="font-medium">{person.known_for_department}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Known Credits</p>
                    <p className="font-medium">{person.total_movie_credits + person.total_tv_credits}</p>
                  </div>

                  {person.gender && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Gender</p>
                      <p className="font-medium">{person.gender === 1 ? 'Female' : person.gender === 2 ? 'Male' : 'Not specified'}</p>
                    </div>
                  )}

                  {person.birthday && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Birthday</p>
                      <p className="font-medium">
                        {formatDate(person.birthday)}
                        {!person.deathday && (
                          <span className="text-primary"> ({calculateAge(person.birthday)} years old)</span>
                        )}
                      </p>
                    </div>
                  )}

                  {person.deathday && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Died</p>
                      <p className="font-medium">
                        {formatDate(person.deathday)} ({calculateAge(person.birthday, person.deathday)} years old)
                      </p>
                    </div>
                  )}

                  {person.place_of_birth && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Place of Birth</p>
                      <p className="font-medium">{person.place_of_birth}</p>
                    </div>
                  )}

                  {person.also_known_as && person.also_known_as.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Also Known As</p>
                      <div className="space-y-0.5">
                        {person.also_known_as.slice(0, 5).map((name, i) => (
                          <p key={i} className="text-sm">{name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content - Right Side */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Name */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                {displayName}
              </h1>

              {/* Biography */}
              {biography && (
                <section>
                  <h2 className="text-xl font-semibold mb-3">Biography</h2>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    <p>{showFullBio ? biography : truncatedBio}</p>
                    {biography.length > 500 && (
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2 text-primary font-medium"
                        onClick={() => setShowFullBio(!showFullBio)}
                      >
                        {showFullBio ? (
                          <>Show Less <ChevronUp className="h-4 w-4 ml-1" /></>
                        ) : (
                          <>Read More <ChevronDown className="h-4 w-4 ml-1" /></>
                        )}
                      </Button>
                    )}
                  </div>
                </section>
              )}

              {/* Known For */}
              {person.known_for && person.known_for.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-4">Known For</h2>
                  <ScrollArea className="w-full">
                    <div className="flex gap-4 pb-2">
                      {person.known_for.map((item) => (
                        <KnownForCard key={`${item.media_type}-${item.id}`} item={item} />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </section>
              )}

              {/* Acting Credits */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Acting</h2>
                  <div className="flex items-center gap-2">
                    <Select value={creditFilter} onValueChange={(v) => setCreditFilter(v as any)}>
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="movie">Movies</SelectItem>
                        <SelectItem value="tv">TV Shows</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Department</SelectItem>
                        <SelectItem value="acting">Acting</SelectItem>
                        <SelectItem value="directing">Directing</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Credits Timeline List */}
                <div className="space-y-0 border rounded-lg p-4">
                  {filteredCredits.length > 0 ? (
                    filteredCredits.slice(0, 20).map((credit, index) => (
                      <div
                        key={`${credit.media_type}-${credit.id}-${index}`}
                        className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer rounded px-2 -mx-2"
                        onClick={() => navigate(`/watch/${credit.media_type === 'movie' ? 'movie' : 'series'}/${credit.id}`)}
                      >
                        {/* Year */}
                        <div className="w-12 text-sm text-muted-foreground flex-shrink-0">
                          {credit.release_year || '—'}
                        </div>
                        
                        {/* Timeline dot */}
                        <div className="flex-shrink-0 mt-1.5">
                          <Circle className="h-3 w-3 text-muted-foreground" />
                        </div>
                        
                        {/* Title and character */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground hover:text-primary transition-colors">
                            {credit.title}
                          </p>
                          {credit.character && (
                            <p className="text-sm text-muted-foreground">
                              as {credit.character}
                            </p>
                          )}
                          {credit.episode_count && (
                            <p className="text-xs text-muted-foreground">
                              {credit.episode_count} episode{credit.episode_count > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        
                        {/* Rating badge */}
                        {credit.vote_average > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {credit.vote_average.toFixed(1)}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No credits found
                    </p>
                  )}
                  
                  {filteredCredits.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground pt-4">
                      Showing 20 of {filteredCredits.length} credits
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CelebrityPage;
