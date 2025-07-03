import { showSkeleton, hideSkeleton } from './main.js';

export function showFeedSkeleton(selector = '.feed-skeleton-container') {
  showSkeleton(selector);
}

export function hideFeedSkeleton(selector = '.feed-skeleton-container') {
  hideSkeleton(selector);
}

// Re-export generic functions for convenience if modules import from this file
export { showSkeleton, hideSkeleton };
