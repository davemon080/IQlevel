import { Job, MarketItem, Post, UserPerformanceSummary, UserProfile } from '../types';

type SellerRatingMeta = Record<string, { avg: number; count: number }>;
type PerformanceMeta = Record<string, UserPerformanceSummary>;

export interface FeedAlgorithmContext {
  viewer: UserProfile;
  likesByPostId?: Record<string, number>;
  commentsByPostId?: Record<string, number>;
  profileByUid?: Record<string, UserProfile>;
  connectedAuthorUids?: Iterable<string>;
  followedAuthorUids?: Iterable<string>;
  hiddenPostIds?: Iterable<string>;
  now?: number;
}

export interface MarketAlgorithmContext {
  viewer: UserProfile;
  query?: string;
  selectedCategory?: string;
  sellerRatingMeta?: SellerRatingMeta;
  now?: number;
}

export interface PeopleAlgorithmContext {
  viewer: UserProfile;
  connectedUids?: Iterable<string>;
  performanceByUid?: PerformanceMeta;
  now?: number;
}

export interface JobAlgorithmContext {
  viewer: UserProfile;
  now?: number;
}

export interface RankedResult<T> {
  item: T;
  score: number;
}

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parseDate(value: string | undefined) {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function hoursSince(value: string | undefined, now = Date.now()) {
  return Math.max(0, (now - parseDate(value)) / HOUR_MS);
}

function daysSince(value: string | undefined, now = Date.now()) {
  return Math.max(0, (now - parseDate(value)) / DAY_MS);
}

function freshnessScore(value: string | undefined, horizonHours: number, maxScore: number, now = Date.now()) {
  const ageHours = hoursSince(value, now);
  return clamp((horizonHours - ageHours) / horizonHours) * maxScore;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function tokenOverlap(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let matches = 0;
  aSet.forEach((value) => {
    if (bSet.has(value)) matches += 1;
  });
  return matches;
}

function toSet(values?: Iterable<string>) {
  return new Set(values || []);
}

function getViewerInterestTokens(viewer: UserProfile) {
  return tokenize([
    viewer.role,
    viewer.location || '',
    viewer.status || '',
    viewer.bio || '',
    ...(viewer.skills || []),
    viewer.companyInfo?.name || '',
  ].join(' '));
}

export function rankFeedPosts(posts: Post[], context: FeedAlgorithmContext): RankedResult<Post>[] {
  const now = context.now || Date.now();
  const connectedAuthorUids = toSet(context.connectedAuthorUids);
  const followedAuthorUids = toSet(context.followedAuthorUids);
  const hiddenPostIds = toSet(context.hiddenPostIds);
  const viewerInterestTokens = getViewerInterestTokens(context.viewer);

  return posts
    .map((post) => {
      const author = context.profileByUid?.[post.authorUid];
      const contentTokens = tokenize([post.content, post.type, author?.displayName || '', author?.role || ''].join(' '));
      const overlap = tokenOverlap(viewerInterestTokens, contentTokens);
      const likes = context.likesByPostId?.[post.id] || 0;
      const comments = context.commentsByPostId?.[post.id] || 0;

      let score = 0;
      score += freshnessScore(post.createdAt, 72, 34, now);
      score += Math.min(20, Math.log10(likes + 1) * 8 + Math.log10(comments + 1) * 10);
      score += Math.min(12, overlap * 2.4);
      score += post.imageUrl ? 4 : 0;
      score += post.type === 'job' && context.viewer.role === 'freelancer' ? 8 : 0;
      score += post.type === 'social' ? 2 : 0;
      score += post.authorUid === context.viewer.uid ? 6 : 0;
      score += connectedAuthorUids.has(post.authorUid) ? 16 : 0;
      score += followedAuthorUids.has(post.authorUid) ? 10 : 0;
      score += author?.location && author.location === context.viewer.location ? 4 : 0;
      score += Math.min(8, ((author?.skills || []).filter((skill) => context.viewer.skills?.includes(skill)).length || 0) * 2);
      score -= hiddenPostIds.has(post.id) ? 1000 : 0;

      return { item: post, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function rankMarketItems(items: MarketItem[], context: MarketAlgorithmContext): RankedResult<MarketItem>[] {
  const now = context.now || Date.now();
  const normalizedQueryTokens = tokenize(context.query || '');

  return items
    .map((item) => {
      const seller = item.seller;
      const itemTokens = tokenize([
        item.title,
        item.category,
        item.description || '',
        seller?.displayName || '',
        seller?.location || '',
      ].join(' '));
      const overlap = tokenOverlap(normalizedQueryTokens, itemTokens);
      const sellerMeta = context.sellerRatingMeta?.[item.sellerUid];
      const sellerReputation = sellerMeta ? clamp((sellerMeta.avg / 5) * 0.7 + Math.min(sellerMeta.count, 10) / 20) : 0;

      let score = 0;
      score += freshnessScore(item.createdAt, 24 * 14, 24, now);
      score += normalizedQueryTokens.length > 0 ? Math.min(24, overlap * 7) : 8;
      score += context.selectedCategory && context.selectedCategory === item.category ? 10 : 0;
      score += item.isNegotiable ? 3 : 0;
      score += item.imageUrls.length > 0 ? Math.min(5, item.imageUrls.length * 1.5) : 0;
      score += item.stockQuantity > 0 ? 6 : -40;
      score += seller?.location && seller.location === context.viewer.location ? 4 : 0;
      score += sellerReputation * 18;
      score -= daysSince(item.createdAt, now) > 30 ? 8 : 0;

      return { item, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function rankSuggestedUsers(users: UserProfile[], context: PeopleAlgorithmContext): RankedResult<UserProfile>[] {
  const connectedUids = toSet(context.connectedUids);
  const viewerTokens = getViewerInterestTokens(context.viewer);

  return users
    .map((user) => {
      const tokens = tokenize([
        user.displayName,
        user.role,
        user.location || '',
        user.status || '',
        user.bio || '',
        ...(user.skills || []),
      ].join(' '));
      const overlap = tokenOverlap(viewerTokens, tokens);
      const performance = context.performanceByUid?.[user.uid];
      const profileDepth = [
        user.bio,
        user.location,
        user.status,
        user.photoURL,
        user.skills?.length,
        user.portfolio?.length,
        user.companyInfo?.name,
      ].filter(Boolean).length;

      let score = 0;
      score += connectedUids.has(user.uid) ? -1000 : 0;
      score += user.uid === context.viewer.uid ? -1000 : 0;
      score += overlap * 3;
      score += user.role !== context.viewer.role ? 14 : 5;
      score += user.location && user.location === context.viewer.location ? 8 : 0;
      score += user.education?.university && user.education.university === context.viewer.education?.university ? 12 : 0;
      score += Math.min(12, ((user.skills || []).filter((skill) => context.viewer.skills?.includes(skill)).length || 0) * 4);
      score += Math.min(10, profileDepth * 1.5);
      score += performance ? Math.min(12, performance.gigsCompleted * 0.6 + performance.ratingAverage * 1.8) : 0;

      return { item: user, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function rankJobs(jobs: Job[], context: JobAlgorithmContext): RankedResult<Job>[] {
  const now = context.now || Date.now();
  const viewerTokens = getViewerInterestTokens(context.viewer);

  return jobs
    .map((job) => {
      const jobTokens = tokenize([job.title, job.description, job.category].join(' '));
      const overlap = tokenOverlap(viewerTokens, jobTokens);

      let score = 0;
      score += freshnessScore(job.createdAt, 24 * 10, 24, now);
      score += job.status === 'open' ? 18 : -100;
      score += overlap * 4;
      score += job.isRemote ? 6 : 0;
      score += job.isStudentFriendly ? 8 : 0;
      score += Math.min(14, Math.log10(job.budget + 1) * 6);
      score += context.viewer.role === 'freelancer' ? 4 : 0;

      return { item: job, score };
    })
    .sort((a, b) => b.score - a.score);
}
