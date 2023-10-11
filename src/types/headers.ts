export type RateLimiterHeaders = {
  'Retry-After'?: number;
  'X-RateLimit-Limit'?: number;
  'X-RateLimit-Remaining'?: number;
  'X-RateLimit-Reset'?: Date;
};
