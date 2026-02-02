/**
 * Video Request Cache System for MP4 Progressive Download
 * Implements in-memory caching for range requests to enable faster seeking and replay
 */

// Cache configuration
const MP4_CACHE_CONFIG = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB max cache
  maxEntries: 50,
  cacheExpiry: 30 * 60 * 1000, // 30 minutes
  enableRangeCoalescing: true,
};

interface CacheEntry {
  url: string;
  data: ArrayBuffer;
  rangeStart: number;
  rangeEnd: number;
  timestamp: number;
  contentLength: number;
  etag?: string;
}

interface RangeRequest {
  start: number;
  end: number | null;
}

class VideoRequestCache {
  private cache: Map<string, CacheEntry[]> = new Map();
  private totalSize = 0;
  private hitCount = 0;
  private missCount = 0;

  /**
   * Parse range header to get start and end bytes
   */
  private parseRangeHeader(rangeHeader: string): RangeRequest | null {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) return null;
    
    return {
      start: parseInt(match[1], 10),
      end: match[2] ? parseInt(match[2], 10) : null,
    };
  }

  /**
   * Generate cache key for URL (normalize query params)
   */
  private getCacheKey(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove cache-busting params but keep essential ones
      urlObj.searchParams.delete('_');
      urlObj.searchParams.delete('timestamp');
      urlObj.searchParams.delete('t');
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Find cached data that covers the requested range
   */
  findCachedRange(url: string, start: number, end: number | null): ArrayBuffer | null {
    const key = this.getCacheKey(url);
    const entries = this.cache.get(key);
    
    if (!entries || entries.length === 0) {
      this.missCount++;
      return null;
    }

    // Clean expired entries
    const now = Date.now();
    const validEntries = entries.filter(e => now - e.timestamp < MP4_CACHE_CONFIG.cacheExpiry);
    
    if (validEntries.length !== entries.length) {
      this.cache.set(key, validEntries);
    }

    // Find an entry that covers the requested range
    for (const entry of validEntries) {
      const requestedEnd = end ?? entry.contentLength;
      
      if (entry.rangeStart <= start && entry.rangeEnd >= requestedEnd) {
        // Cache hit - extract the requested portion
        this.hitCount++;
        const offsetStart = start - entry.rangeStart;
        const offsetEnd = requestedEnd - entry.rangeStart;
        return entry.data.slice(offsetStart, offsetEnd + 1);
      }
    }

    // Try to coalesce nearby ranges if enabled
    if (MP4_CACHE_CONFIG.enableRangeCoalescing) {
      const coalesced = this.tryCoalesceRanges(validEntries, start, end);
      if (coalesced) {
        this.hitCount++;
        return coalesced;
      }
    }

    this.missCount++;
    return null;
  }

  /**
   * Try to combine multiple cached ranges to cover request
   */
  private tryCoalesceRanges(entries: CacheEntry[], start: number, end: number | null): ArrayBuffer | null {
    if (!end) return null;
    
    // Sort entries by range start
    const sorted = [...entries].sort((a, b) => a.rangeStart - b.rangeStart);
    
    // Check if we can combine entries to cover the range
    let currentPos = start;
    const chunks: ArrayBuffer[] = [];
    
    for (const entry of sorted) {
      if (entry.rangeStart > currentPos) {
        // Gap in coverage
        return null;
      }
      
      if (entry.rangeEnd >= currentPos) {
        // This entry contributes to the range
        const entryStart = Math.max(0, currentPos - entry.rangeStart);
        const entryEnd = Math.min(entry.data.byteLength, end - entry.rangeStart + 1);
        
        if (entryStart < entryEnd) {
          chunks.push(entry.data.slice(entryStart, entryEnd));
          currentPos = entry.rangeStart + entryEnd;
        }
      }
      
      if (currentPos > end) break;
    }
    
    if (currentPos <= end) {
      // Couldn't cover the full range
      return null;
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return result.buffer;
  }

  /**
   * Store response data in cache
   */
  storeRange(
    url: string,
    data: ArrayBuffer,
    rangeStart: number,
    rangeEnd: number,
    contentLength: number,
    etag?: string
  ): void {
    const key = this.getCacheKey(url);
    
    // Evict if cache is too large
    while (this.totalSize + data.byteLength > MP4_CACHE_CONFIG.maxCacheSize) {
      this.evictOldest();
    }
    
    const entry: CacheEntry = {
      url: key,
      data,
      rangeStart,
      rangeEnd,
      timestamp: Date.now(),
      contentLength,
      etag,
    };

    const existing = this.cache.get(key) || [];
    
    // Remove overlapping entries to avoid duplicates
    const filtered = existing.filter(e => 
      e.rangeEnd < rangeStart || e.rangeStart > rangeEnd
    );
    
    // Update total size
    const removedSize = existing.reduce((sum, e) => sum + e.data.byteLength, 0);
    const newSize = filtered.reduce((sum, e) => sum + e.data.byteLength, 0) + data.byteLength;
    this.totalSize = this.totalSize - removedSize + newSize;
    
    filtered.push(entry);
    this.cache.set(key, filtered);
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldest: { key: string; index: number; timestamp: number } | null = null;
    
    for (const [key, entries] of this.cache.entries()) {
      for (let i = 0; i < entries.length; i++) {
        if (!oldest || entries[i].timestamp < oldest.timestamp) {
          oldest = { key, index: i, timestamp: entries[i].timestamp };
        }
      }
    }
    
    if (oldest) {
      const entries = this.cache.get(oldest.key)!;
      const removed = entries.splice(oldest.index, 1)[0];
      this.totalSize -= removed.data.byteLength;
      
      if (entries.length === 0) {
        this.cache.delete(oldest.key);
      }
    }
  }

  /**
   * Preload initial bytes of MP4 for faster start
   */
  async preloadMp4Start(url: string, bytes = 2 * 1024 * 1024): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: {
          Range: `bytes=0-${bytes - 1}`,
        },
      });

      if (response.ok || response.status === 206) {
        const data = await response.arrayBuffer();
        const contentRange = response.headers.get('Content-Range');
        let contentLength = bytes;
        
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) contentLength = parseInt(match[1], 10);
        }
        
        this.storeRange(url, data, 0, data.byteLength - 1, contentLength);
        console.log(`[VideoCache] Preloaded ${(data.byteLength / 1024).toFixed(1)}KB of ${url.substring(0, 50)}...`);
      }
    } catch (error) {
      console.warn('[VideoCache] Preload failed:', error);
    }
  }

  /**
   * Clear cache for specific URL
   */
  clearUrl(url: string): void {
    const key = this.getCacheKey(url);
    const entries = this.cache.get(key);
    
    if (entries) {
      const size = entries.reduce((sum, e) => sum + e.data.byteLength, 0);
      this.totalSize -= size;
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values()).flat();
    return {
      totalSize: this.totalSize,
      totalEntries: entries.length,
      urlsCached: this.cache.size,
      hitRate: this.hitCount + this.missCount > 0 
        ? (this.hitCount / (this.hitCount + this.missCount) * 100).toFixed(1) + '%'
        : 'N/A',
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }
}

// Global singleton instance
export const videoRequestCache = new VideoRequestCache();

/**
 * Create a Shaka networking engine request filter for caching
 */
export function createCachingRequestFilter(cache: VideoRequestCache) {
  return (type: number, request: any, context: any) => {
    // Only cache segment requests (type 1) and MP4 files
    if (type !== 1) return;
    
    const url = request.uris[0];
    if (!url.includes('.mp4') && !url.includes('.m4s')) return;
    
    // Check if we have cached data for this range
    const rangeHeader = request.headers['Range'];
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : null;
        
        const cached = cache.findCachedRange(url, start, end);
        if (cached) {
          console.log(`[VideoCache] Cache hit for range ${start}-${end}`);
          // We can't directly return cached data in request filter,
          // but we can set a flag for the response filter
          (request as any).__cacheHit = true;
          (request as any).__cachedData = cached;
        }
      }
    }
  };
}

/**
 * Create a Shaka networking engine response filter for caching
 */
export function createCachingResponseFilter(cache: VideoRequestCache) {
  return (type: number, response: any, context: any) => {
    // Only cache segment requests (type 1)
    if (type !== 1) return;
    
    const request = context?.request;
    if (!request) return;
    
    const url = request.uris?.[0];
    if (!url || (!url.includes('.mp4') && !url.includes('.m4s'))) return;
    
    // Don't cache if already cached
    if ((request as any).__cacheHit) return;
    
    // Parse range from response headers
    const contentRange = response.headers?.['Content-Range'] || response.headers?.['content-range'];
    if (contentRange && response.data) {
      const match = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        const total = parseInt(match[3], 10);
        
        cache.storeRange(url, response.data, start, end, total);
        console.log(`[VideoCache] Cached range ${start}-${end} of ${total}`);
      }
    }
  };
}
