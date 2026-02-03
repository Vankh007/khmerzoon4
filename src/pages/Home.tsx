import HeroBanner from '@/components/HeroBanner';
import ContentRow from '@/components/ContentRow';
import TopSection from '@/components/TopSection';
import TopMoviesSection from '@/components/TopMoviesSection';
import TopAnimesSection from '@/components/TopAnimesSection';
import MobileHeroBanner from '@/components/MobileHeroBanner';
import MobileCircleSlider from '@/components/MobileCircleSlider';
import MobileTopSection from '@/components/MobileTopSection';
import MobileContentSection from '@/components/MobileContentSection';
import CollectionsScroll from '@/components/CollectionsScroll';
import HomeWatchHistory from '@/components/HomeWatchHistory';
import HomeContinuousWatch from '@/components/HomeContinuousWatch';
import { UpcomingSection } from '@/components/UpcomingSection';
import AdSlot from '@/components/ads/AdSlot';
import SeriesUpdateTodaySection from '@/components/SeriesUpdateTodaySection';
import TopCelebritiesSection from '@/components/TopCelebritiesSection';
import PinnedSeriesSection from '@/components/PinnedSeriesSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsIPad } from '@/hooks/use-ipad';
import { useHomeSections } from '@/hooks/useHomeSections';
const Home = () => {
  const isMobile = useIsMobile();
  const { isIPadPortrait, isIPadLandscape } = useIsIPad();
  const { isVisibleWeb, isVisibleMobile, loading } = useHomeSections();

  // Mobile layout: mobile devices OR iPad in portrait mode
  const useMobileLayout = isMobile || isIPadPortrait;

  if (useMobileLayout) {
    return (
      <div className="min-h-screen scrollbar-hide">
        {isVisibleMobile('hero_banner') && <MobileHeroBanner page="home" />}
        {isVisibleMobile('circle_slider') && <MobileCircleSlider />}
        {isVisibleMobile('continuous_watch') && <HomeContinuousWatch />}
        {isVisibleMobile('pinned_series') && <PinnedSeriesSection />}
        {isVisibleMobile('top_section') && <MobileTopSection />}
        {isVisibleMobile('series_update_today') && <SeriesUpdateTodaySection />}
        <AdSlot placement="banner" pageLocation="home_top_series" className="px-4 py-2" />
        {isVisibleMobile('top_celebrities') && <TopCelebritiesSection className="px-4" />}
        {isVisibleMobile('trending') && <MobileContentSection title="Trending Now" type="trending" link="/movies" />}
        {isVisibleMobile('new_releases') && <MobileContentSection title="New Releases" type="new_releases" link="/movies" />}
        {isVisibleMobile('upcoming') && <UpcomingSection />}
        {isVisibleMobile('collections') && <CollectionsScroll />}
        <AdSlot placement="banner" pageLocation="home_collections" className="px-4 py-2" />
      </div>
    );
  }

  // Desktop Layout (also used for iPad landscape)
  return (
    <div className="pb-8">
      {isVisibleWeb('hero_banner') && <HeroBanner page="home" />}
      <div className="space-y-6">
        {isVisibleWeb('pinned_series') && <PinnedSeriesSection className="px-0 mx-[15px]" />}
        {isVisibleWeb('top_section') && <TopSection className="px-0 mx-[15px]" />}
        {isVisibleWeb('series_update_today') && <SeriesUpdateTodaySection className="px-[15px]" />}
        <AdSlot placement="banner" pageLocation="home_top_series" className="px-4" />
        {isVisibleWeb('top_animes') && <TopAnimesSection className="mx-[15px] px-[15px]" />}
        {isVisibleWeb('watch_history') && <HomeWatchHistory />}
        {isVisibleWeb('continuous_watch') && <HomeContinuousWatch />}
        {isVisibleWeb('top_movies') && <TopMoviesSection className="px-[15px] mx-[15px]" />}
        {isVisibleWeb('top_celebrities') && <TopCelebritiesSection className="mx-[15px]" />}
        {isVisibleWeb('upcoming') && <UpcomingSection className="mx-[15px] px-0" />}
        {isVisibleWeb('collections') && <CollectionsScroll />}
        <AdSlot placement="banner" pageLocation="home_collections" className="px-4" />
        {isVisibleWeb('trending') && <ContentRow title="Trending Now" className="px-[15px] mx-[15px]" />}
        {isVisibleWeb('new_releases') && <ContentRow title="New Releases" className="px-[15px] mx-[15px]" />}
        <AdSlot placement="banner" pageLocation="home_new_releases" className="px-4" />
      </div>
    </div>
  );
};

export default Home;
