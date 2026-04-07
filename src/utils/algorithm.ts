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
  query?: string;
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

function normalizeText(value: string) {
  return value.toLowerCase().trim();
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

function overlapRatio(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  return tokenOverlap(a, b) / Math.max(1, Math.min(new Set(a).size, new Set(b).size));
}

function toSet(values?: Iterable<string>) {
  return new Set(values || []);
}

function logScore(value: number, multiplier: number, cap: number) {
  return Math.min(cap, Math.log10(value + 1) * multiplier);
}

function completenessScore(values: Array<unknown>, multiplier: number, cap: number) {
  return Math.min(cap, values.filter(Boolean).length * multiplier);
}

function blendedFreshness(value: string | undefined, now = Date.now()) {
  return (
    freshnessScore(value, 24, 22, now) +
    freshnessScore(value, 24 * 3, 16, now) +
    freshnessScore(value, 24 * 14, 8, now)
  );
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

export function scoreSearchMatch(query: string, fields: string[], weights?: number[]) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;
  const queryTokens = tokenize(normalizedQuery);

  return fields.reduce((total, field, index) => {
    const normalizedField = normalizeText(field || '');
    if (!normalizedField) return total;

    const fieldTokens = tokenize(normalizedField);
    const overlap = tokenOverlap(queryTokens, fieldTokens);
    const ratio = overlapRatio(queryTokens, fieldTokens);
    const exactBoost = normalizedField === normalizedQuery ? 40 : 0;
    const prefixBoost = normalizedField.startsWith(normalizedQuery) ? 20 : 0;
    const phraseBoost = normalizedField.includes(normalizedQuery) ? 14 : 0;
    const tokenScore = overlap * 6 + ratio * 18;
    const weight = weights?.[index] ?? 1;

    return total + (exactBoost + prefixBoost + phraseBoost + tokenScore) * weight;
  }, 0);
}

function diversifyRankedResults<T>(
  ranked: RankedResult<T>[],
  groupKey: (item: T) => string,
  penaltyFactor = 0.84
) {
  const remaining = [...ranked];
  const selected: RankedResult<T>[] = [];
  const seenGroups = new Map<string, number>();

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    remaining.forEach((entry, index) => {
      const key = groupKey(entry.item);
      const seenCount = seenGroups.get(key) || 0;
      const adjusted = entry.score * Math.pow(penaltyFactor, seenCount);
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = index;
      }
    });

    const [picked] = remaining.splice(bestIndex, 1);
    const key = groupKey(picked.item);
    const seenCount = seenGroups.get(key) || 0;
    seenGroups.set(key, seenCount + 1);
    selected.push({ ...picked, score: bestScore });
  }

  return selected;
}

export function rankFeedPosts(posts: Post[], context: FeedAlgorithmContext): RankedResult<Post>[] {
  const now = context.now || Date.now();
  const connectedAuthorUids = toSet(context.connectedAuthorUids);
  const followedAuthorUids = toSet(context.followedAuthorUids);
  const hiddenPostIds = toSet(context.hiddenPostIds);
  const viewerInterestTokens = getViewerInterestTokens(context.viewer);
 
  return diversifyRankedResults(
    posts
      .map((post) => {
        const author = context.profileByUid?.[post.authorUid];
        const contentTokens = tokenize([post.content, post.type, author?.displayName || '', author?.role || ''].join(' '));
        const overlap = tokenOverlap(viewerInterestTokens, contentTokens);
        const likes = context.likesByPostId?.[post.id] || 0;
        const comments = context.commentsByPostId?.[post.id] || 0;
        const authorCompleteness = completenessScore(
          [author?.photoURL, author?.bio, author?.location, author?.skills?.length, author?.portfolio?.length],
          1.6,
          8
        );
        const contentLength = post.content.trim().length;

        let score = 0;
        score += blendedFreshness(post.createdAt, now);
        score += logScore(likes, 7, 14);
        score += logScore(comments, 11, 18);
        score += Math.min(16, overlap * 2.8 + overlapRatio(viewerInterestTokens, contentTokens) * 10);
        score += post.imageUrl ? 4 : 0;
        score += post.type === 'job' && context.viewer.role === 'freelancer' ? 8 : 0;
        score += post.type === 'social' ? 2 : 0;
        score += post.authorUid === context.viewer.uid ? 6 : 0;
        score += connectedAuthorUids.has(post.authorUid) ? 16 : 0;
        score += followedAuthorUids.has(post.authorUid) ? 10 : 0;
        score += author?.location && author.location === context.viewer.location ? 4 : 0;
        score += Math.min(8, ((author?.skills || []).filter((skill) => context.viewer.skills?.includes(skill)).length || 0) * 2);
        score += authorCompleteness;
        score += contentLength >= 40 && contentLength <= 280 ? 4 : 0;
        score -= hoursSince(post.createdAt, now) > 168 ? 8 : 0;
        score -= hiddenPostIds.has(post.id) ? 1000 : 0;

        return { item: post, score: Math.round(score * 100) / 100 };
      })
      .sort((a, b) => b.score - a.score),
    (post) => post.authorUid
  );
}

export function rankMarketItems(items: MarketItem[], context: MarketAlgorithmContext): RankedResult<MarketItem>[] {
  const now = context.now || Date.now();
  const normalizedQueryTokens = tokenize(context.query || '');

  return diversifyRankedResults(
    items
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
      const queryScore = scoreSearchMatch(context.query || '', [
        item.title,
        item.category,
        item.description || '',
        seller?.displayName || '',
      ], [1.8, 1.2, 1, 0.75]);
      const sellerCompleteness = completenessScore(
        [seller?.photoURL, seller?.bio, seller?.location, seller?.skills?.length],
        1.2,
        6
      );

      let score = 0;
      score += blendedFreshness(item.createdAt, now);
      score += normalizedQueryTokens.length > 0 ? Math.min(34, queryScore + overlap * 4) : 10;
      score += context.selectedCategory && context.selectedCategory === item.category ? 10 : 0;
      score += item.isNegotiable ? 3 : 0;
      score += item.imageUrls.length > 0 ? Math.min(5, item.imageUrls.length * 1.5) : 0;
      score += item.stockQuantity > 0 ? 6 : -40;
      score += seller?.location && seller.location === context.viewer.location ? 4 : 0;
      score += sellerReputation * 18;
      score += sellerCompleteness;
      score += item.isAnonymous ? -4 : 3;
      score += item.price > 0 ? 2 : -30;
      score -= daysSince(item.createdAt, now) > 30 ? 8 : 0;

      return { item, score };
    })
      .sort((a, b) => b.score - a.score),
    (item) => item.sellerUid
  );
}

export function rankSuggestedUsers(users: UserProfile[], context: PeopleAlgorithmContext): RankedResult<UserProfile>[] {
  const connectedUids = toSet(context.connectedUids);
  const viewerTokens = getViewerInterestTokens(context.viewer);

  return diversifyRankedResults(
    users
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
      const profileDepth = completenessScore([
        user.bio,
        user.location,
        user.status,
        user.photoURL,
        user.skills?.length,
        user.portfolio?.length,
        user.companyInfo?.name,
        user.experience?.length,
        user.socialLinks?.linkedin || user.socialLinks?.github,
      ], 1.25, 12);
      const complementBoost =
        context.viewer.role === 'freelancer' && user.role === 'client'
          ? 10
          : context.viewer.role === 'client' && user.role === 'freelancer'
          ? 12
          : 4;

      let score = 0;
      score += connectedUids.has(user.uid) ? -1000 : 0;
      score += user.uid === context.viewer.uid ? -1000 : 0;
      score += overlap * 3 + overlapRatio(viewerTokens, tokens) * 12;
      score += complementBoost;
      score += user.location && user.location === context.viewer.location ? 8 : 0;
      score += user.education?.university && user.education.university === context.viewer.education?.university ? 12 : 0;
      score += Math.min(12, ((user.skills || []).filter((skill) => context.viewer.skills?.includes(skill)).length || 0) * 4);
      score += profileDepth;
      score += performance ? Math.min(14, performance.gigsCompleted * 0.7 + performance.ratingAverage * 2 + performance.ratingCount * 0.35) : 0;

      return { item: user, score };
    })
      .sort((a, b) => b.score - a.score),
    (user) => user.role
  );
}

export function rankJobs(jobs: Job[], context: JobAlgorithmContext): RankedResult<Job>[] {
  const now = context.now || Date.now();
  const viewerTokens = getViewerInterestTokens(context.viewer);
  const queryScoreEnabled = Boolean(context.query?.trim());

  return diversifyRankedResults(
    jobs
      .map((job) => {
      const jobTokens = tokenize([job.title, job.description, job.category].join(' '));
      const overlap = tokenOverlap(viewerTokens, jobTokens);
      const queryScore = scoreSearchMatch(context.query || '', [job.title, job.category, job.description], [1.8, 1.2, 1]);
      const detailBoost = job.description.trim().length >= 80 ? 4 : 0;

      let score = 0;
      score += blendedFreshness(job.createdAt, now);
      score += job.status === 'open' ? 18 : -100;
      score += overlap * 4 + overlapRatio(viewerTokens, jobTokens) * 12;
      score += queryScoreEnabled ? Math.min(34, queryScore) : 0;
      score += job.isRemote ? 6 : 0;
      score += job.isStudentFriendly ? 8 : 0;
      score += Math.min(14, Math.log10(job.budget + 1) * 6);
      score += context.viewer.role === 'freelancer' ? 4 : 0;
      score += detailBoost;
      score += job.clientUid === context.viewer.uid ? 5 : 0;

      return { item: job, score };
    })
      .sort((a, b) => b.score - a.score),
    (job) => job.clientUid
  );
}
