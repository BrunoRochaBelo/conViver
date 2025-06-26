export function showFeedSkeleton(selector = '.feed-skeleton-container') {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) el.style.display = 'block';
}

export function hideFeedSkeleton(selector = '.feed-skeleton-container') {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) el.style.display = 'none';
}
