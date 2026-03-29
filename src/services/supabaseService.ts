import { supabase } from '../supabase';
import { UserProfile, Post, Job, Message, Proposal, Attachment, FriendRequest, Connection, Wallet, WalletTransaction, WalletCurrency, AppNotification, PostLike, PostComment, NotificationSettings } from '../types';

type DbUserProfile = {
  uid: string;
  public_id?: string | null;
  email: string;
  display_name: string;
  photo_url: string;
  cover_photo_url?: string | null;
  role: 'freelancer' | 'client' | 'admin';
  bio?: string | null;
  phone_number?: string | null;
  status?: string | null;
  location?: string | null;
  skills?: string[] | null;
  education?: UserProfile['education'] | null;
  experience?: UserProfile['experience'] | null;
  social_links?: UserProfile['socialLinks'] | null;
  portfolio?: UserProfile['portfolio'] | null;
  company_info?: UserProfile['companyInfo'] | null;
  created_at?: string;
};

type DbPost = {
  id: string;
  author_uid: string;
  author_name: string;
  author_photo: string;
  content: string;
  image_url?: string | null;
  type: 'social' | 'job';
  created_at: string;
};

type DbPostLike = {
  id: string;
  post_id: string;
  user_uid: string;
  created_at: string;
};

type DbPostComment = {
  id: string;
  post_id: string;
  user_uid: string;
  author_name: string;
  author_photo: string;
  content: string;
  created_at: string;
};

type DbJob = {
  id: string;
  client_uid: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  is_student_friendly: boolean;
  is_remote: boolean;
  status: 'open' | 'closed';
  created_at: string;
};

type DbMessage = {
  id: string;
  sender_uid: string;
  receiver_uid: string;
  content: string | null;
  created_at: string;
  attachments?: Attachment[] | null;
};

type DbProposal = {
  id: string;
  freelancer_uid: string;
  job_id: string;
  content: string;
  budget: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

type DbFriendRequest = {
  id: string;
  from_uid: string;
  from_name: string;
  from_photo: string;
  to_uid: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

type DbConnection = {
  id: string;
  uids: string[];
  created_at: string;
};

type DbWallet = {
  id: string;
  user_uid: string;
  usd_balance: number;
  ngn_balance: number;
  eur_balance: number;
  updated_at: string;
};

type DbWalletTransaction = {
  id: string;
  user_uid: string;
  currency: WalletCurrency;
  type: 'topup' | 'withdraw';
  method: 'card' | 'transfer';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  reference?: string | null;
};

type DbWalletSecurity = {
  user_uid: string;
  pin_hash: string;
  updated_at: string;
  created_at: string;
};

type DbPostLikeNotificationRow = {
  id: string;
  post_id: string;
  user_uid: string;
  created_at: string;
  posts: { author_uid: string } | { author_uid: string }[] | null;
};

type DbPostCommentNotificationRow = {
  id: string;
  post_id: string;
  user_uid: string;
  author_name: string;
  content: string;
  created_at: string;
  posts: { author_uid: string } | { author_uid: string }[] | null;
};

const NOTIFICATION_SETTINGS_KEY_PREFIX = 'connect_notification_settings_';
const CHAT_READ_KEY_PREFIX = 'connect_chat_read_map_';
const CHAT_READ_EVENT = 'connect:chat-read-updated';

function mapUserProfileFromDb(row: DbUserProfile): UserProfile {
  return {
    uid: row.uid,
    publicId: row.public_id || undefined,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    coverPhotoURL: row.cover_photo_url || undefined,
    role: row.role === 'admin' ? 'client' : row.role,
    bio: row.bio || undefined,
    phoneNumber: row.phone_number || undefined,
    status: row.status || undefined,
    location: row.location || undefined,
    skills: row.skills || undefined,
    education: row.education || undefined,
    experience: row.experience || undefined,
    socialLinks: row.social_links || undefined,
    portfolio: row.portfolio || undefined,
    companyInfo: row.company_info || undefined,
  };
}

function mapUserProfileToDb(data: Partial<UserProfile>): Partial<DbUserProfile> {
  return {
    uid: data.uid,
    public_id: data.publicId,
    email: data.email,
    display_name: data.displayName,
    photo_url: data.photoURL,
    cover_photo_url: data.coverPhotoURL ?? null,
    role: data.role as DbUserProfile['role'] | undefined,
    bio: data.bio ?? null,
    phone_number: data.phoneNumber ?? null,
    status: data.status ?? null,
    location: data.location ?? null,
    skills: data.skills ?? null,
    education: data.education ?? null,
    experience: data.experience ?? null,
    social_links: data.socialLinks ?? null,
    portfolio: data.portfolio ?? null,
    company_info: data.companyInfo ?? null,
  };
}

function mapPostFromDb(row: DbPost): Post {
  return {
    id: row.id,
    authorUid: row.author_uid,
    authorName: row.author_name,
    authorPhoto: row.author_photo,
    content: row.content,
    imageUrl: row.image_url || undefined,
    type: row.type,
    createdAt: row.created_at,
  };
}

function mapPostLikeFromDb(row: DbPostLike): PostLike {
  return {
    id: row.id,
    postId: row.post_id,
    userUid: row.user_uid,
    createdAt: row.created_at,
  };
}

function mapPostCommentFromDb(row: DbPostComment): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    userUid: row.user_uid,
    authorName: row.author_name,
    authorPhoto: row.author_photo,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapJobFromDb(row: DbJob): Job {
  return {
    id: row.id,
    clientUid: row.client_uid,
    title: row.title,
    description: row.description,
    budget: row.budget,
    category: row.category,
    isStudentFriendly: row.is_student_friendly,
    isRemote: row.is_remote,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapMessageFromDb(row: DbMessage): Message {
  return {
    id: row.id,
    senderUid: row.sender_uid,
    receiverUid: row.receiver_uid,
    content: row.content || '',
    createdAt: row.created_at,
    attachments: row.attachments || undefined,
  };
}

function mapProposalFromDb(row: DbProposal): Proposal {
  return {
    id: row.id,
    freelancerUid: row.freelancer_uid,
    jobId: row.job_id,
    content: row.content,
    budget: row.budget,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapFriendRequestFromDb(row: DbFriendRequest): FriendRequest {
  return {
    id: row.id,
    fromUid: row.from_uid,
    fromName: row.from_name,
    fromPhoto: row.from_photo,
    toUid: row.to_uid,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapConnectionFromDb(row: DbConnection): Connection {
  return {
    id: row.id,
    uids: row.uids,
    createdAt: row.created_at,
  };
}

function mapWalletFromDb(row: DbWallet): Wallet {
  return {
    id: row.id,
    userUid: row.user_uid,
    usdBalance: row.usd_balance,
    ngnBalance: row.ngn_balance,
    eurBalance: row.eur_balance,
    updatedAt: row.updated_at,
  };
}

function mapWalletTransactionFromDb(row: DbWalletTransaction): WalletTransaction {
  return {
    id: row.id,
    userUid: row.user_uid,
    currency: row.currency,
    type: row.type,
    method: row.method,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    reference: row.reference || undefined,
  };
}

async function runQuery<T>(promise: any, context: string): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    console.error(`Supabase error (${context}):`, error);
    throw error;
  }
  return data as T;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildPublicId(uid: string) {
  return `SL-${uid.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

async function hashPin(pin: string) {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Secure PIN hashing is not available in this environment.');
  }
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadJsonFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function subscribeToTable<T>(
  table: string,
  fetcher: () => Promise<T>,
  callback: (data: T) => void,
  filter?: string,
  onError?: (error: any) => void
) {
  let active = true;
  let fetchVersion = 0;

  const refresh = () => {
    const currentVersion = ++fetchVersion;
    fetcher()
      .then((data) => {
        // Prevent stale fetch responses from overwriting newer state.
        if (active && currentVersion === fetchVersion) callback(data);
      })
      .catch((error) => {
        console.error(`Supabase fetch error (${table}):`, error);
        if (onError) onError(error);
      });
  };

  refresh();

  const channel = supabase
    .channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      refresh
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export const supabaseService = {
  profileCache: new Map<string, UserProfile>(),

  getNotificationSettings(uid: string): NotificationSettings {
    const defaults: NotificationSettings = {
      wallet: true,
      gigs: true,
      feed: true,
      friendRequests: true,
    };
    return {
      ...defaults,
      ...loadJsonFromStorage<Partial<NotificationSettings>>(`${NOTIFICATION_SETTINGS_KEY_PREFIX}${uid}`, {}),
    };
  },

  updateNotificationSettings(uid: string, updates: Partial<NotificationSettings>): NotificationSettings {
    const next = { ...this.getNotificationSettings(uid), ...updates };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${NOTIFICATION_SETTINGS_KEY_PREFIX}${uid}`, JSON.stringify(next));
    }
    return next;
  },

  getChatReadMap(uid: string): Record<string, string> {
    return loadJsonFromStorage<Record<string, string>>(`${CHAT_READ_KEY_PREFIX}${uid}`, {});
  },

  markChatAsRead(uid: string, otherUid: string, readAt: string = new Date().toISOString()) {
    const readMap = this.getChatReadMap(uid);
    readMap[otherUid] = readAt;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${CHAT_READ_KEY_PREFIX}${uid}`, JSON.stringify(readMap));
      window.dispatchEvent(new CustomEvent(CHAT_READ_EVENT, { detail: { uid, otherUid, readAt } }));
    }
  },

  computeUnreadChatCount(
    uid: string,
    chats: Array<{ otherUid: string; updatedAt: string }>
  ): number {
    const readMap = this.getChatReadMap(uid);
    return chats.filter((chat) => {
      const lastReadAt = readMap[chat.otherUid];
      if (!lastReadAt) return true;
      return new Date(chat.updatedAt).getTime() > new Date(lastReadAt).getTime();
    }).length;
  },

  onChatReadUpdated(handler: (event: Event) => void) {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener(CHAT_READ_EVENT, handler);
    return () => window.removeEventListener(CHAT_READ_EVENT, handler);
  },

  // User Profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const cached = this.profileCache.get(uid);
    if (cached) return cached;

    const data = await runQuery<DbUserProfile | null>(
      supabase.from('users').select('*').eq('uid', uid).maybeSingle(),
      `getUserProfile:${uid}`
    );
    const mapped = data ? mapUserProfileFromDb(data) : null;
    if (mapped) this.profileCache.set(mapped.uid, mapped);
    return mapped;
  },

  subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void, onError?: (error: any) => void) {
    const fetcher = async () => {
      const row = await runQuery<DbUserProfile | null>(
        supabase.from('users').select('*').eq('uid', uid).maybeSingle(),
        `subscribeToUserProfile:${uid}`
      );
      const mapped = row ? mapUserProfileFromDb(row) : null;
      if (mapped) this.profileCache.set(mapped.uid, mapped);
      return mapped;
    };
    return subscribeToTable('users', fetcher, callback, `uid=eq.${uid}`, onError);
  },

  async getUsersByUids(uids: string[]): Promise<UserProfile[]> {
    const uniqueUids = Array.from(new Set(uids.filter(Boolean)));
    if (uniqueUids.length === 0) return [];

    const cachedProfiles: UserProfile[] = [];
    const missingUids: string[] = [];
    uniqueUids.forEach((id) => {
      const cached = this.profileCache.get(id);
      if (cached) cachedProfiles.push(cached);
      else missingUids.push(id);
    });

    if (missingUids.length === 0) {
      const map = new Map(cachedProfiles.map((p) => [p.uid, p]));
      return uniqueUids.map((id) => map.get(id)).filter((p): p is UserProfile => Boolean(p));
    }

    const rows = await runQuery<DbUserProfile[]>(
      supabase.from('users').select('*').in('uid', missingUids),
      'getUsersByUids'
    );
    const fetched = rows.map(mapUserProfileFromDb);
    fetched.forEach((profile) => this.profileCache.set(profile.uid, profile));

    const all = [...cachedProfiles, ...fetched];
    const profileByUid = new Map(all.map((p) => [p.uid, p]));
    return uniqueUids.map((id) => profileByUid.get(id)).filter((p): p is UserProfile => Boolean(p));
  },

  async getUserProfileByPublicId(publicId: string): Promise<UserProfile | null> {
    const normalized = publicId.trim();
    if (!normalized) return null;
    const row = await runQuery<DbUserProfile | null>(
      supabase.from('users').select('*').eq('public_id', normalized).maybeSingle(),
      `getUserProfileByPublicId:${normalized}`
    );
    const mapped = row ? mapUserProfileFromDb(row) : null;
    if (mapped) this.profileCache.set(mapped.uid, mapped);
    return mapped;
  },

  async resolveUserByIdentifier(identifier: string): Promise<UserProfile | null> {
    const normalized = identifier.trim();
    if (!normalized) return null;
    return isUuid(normalized)
      ? this.getUserProfile(normalized)
      : this.getUserProfileByPublicId(normalized);
  },

  async createUserProfile(profile: UserProfile): Promise<void> {
    const payload = mapUserProfileToDb({
      ...profile,
      publicId: profile.publicId || buildPublicId(profile.uid),
    }) as DbUserProfile;
    await runQuery(
      supabase.from('users').upsert(
        { ...payload, created_at: new Date().toISOString() },
        { onConflict: 'uid' }
      ),
      'createUserProfile'
    );
    this.profileCache.set(profile.uid, {
      ...profile,
      publicId: profile.publicId || buildPublicId(profile.uid),
    });
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const payload = mapUserProfileToDb(data);
    await runQuery(
      supabase.from('users').update(payload).eq('uid', uid),
      'updateUserProfile'
    );
    const prev = this.profileCache.get(uid);
    if (prev) this.profileCache.set(uid, { ...prev, ...data });
  },

  async getTopStudents(limitCount: number): Promise<UserProfile[]> {
    const rows = await runQuery<DbUserProfile[]>(
      supabase
        .from('users')
        .select('*')
        .eq('role', 'freelancer')
        .order('created_at', { ascending: false })
        .limit(limitCount),
      'getTopStudents'
    );
    const profiles = rows.map(mapUserProfileFromDb);
    profiles.forEach((profile) => this.profileCache.set(profile.uid, profile));
    return profiles;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const rows = await runQuery<DbUserProfile[]>(
      supabase.from('users').select('*'),
      'getAllUsers'
    );
    const profiles = rows.map(mapUserProfileFromDb);
    profiles.forEach((profile) => this.profileCache.set(profile.uid, profile));
    return profiles;
  },

  async listUsersPaginated(limitCount: number, offsetCount: number, excludeUid?: string): Promise<UserProfile[]> {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offsetCount, offsetCount + limitCount - 1);

    if (excludeUid) {
      query = query.neq('uid', excludeUid);
    }

    const rows = await runQuery<DbUserProfile[]>(
      query,
      'listUsersPaginated'
    );
    const profiles = rows.map(mapUserProfileFromDb);
    profiles.forEach((profile) => this.profileCache.set(profile.uid, profile));
    return profiles;
  },

  // Posts
  async createPost(post: Omit<Post, 'id' | 'createdAt'>): Promise<Post> {
    const row = await runQuery<DbPost>(
      supabase
        .from('posts')
        .insert({
          author_uid: post.authorUid,
          author_name: post.authorName,
          author_photo: post.authorPhoto,
          content: post.content,
          image_url: post.imageUrl || null,
          type: post.type,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single(),
      'createPost'
    );
    return mapPostFromDb(row);
  },

  async listPosts(limitCount: number = 100): Promise<Post[]> {
    const rows = await runQuery<DbPost[]>(
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(limitCount),
      'listPosts'
    );
    return rows.map(mapPostFromDb);
  },

  async getPostById(postId: string): Promise<Post | null> {
    const row = await runQuery<DbPost | null>(
      supabase.from('posts').select('*').eq('id', postId).maybeSingle(),
      'getPostById'
    );
    return row ? mapPostFromDb(row) : null;
  },

  subscribeToPosts(callback: (posts: Post[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbPost[]>(
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        'subscribeToPosts'
      );
      return rows.map(mapPostFromDb);
    };
    return subscribeToTable('posts', fetcher, callback);
  },

  async getPostsByUser(uid: string): Promise<Post[]> {
    const rows = await runQuery<DbPost[]>(
      supabase.from('posts').select('*').eq('author_uid', uid).order('created_at', { ascending: false }),
      'getPostsByUser'
    );
    return rows.map(mapPostFromDb);
  },

  async getHighlights(limitCount: number): Promise<Post[]> {
    const rows = await runQuery<DbPost[]>(
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(limitCount),
      'getHighlights'
    );
    return rows.map(mapPostFromDb);
  },

  async listPostLikes(): Promise<PostLike[]> {
    const rows = await runQuery<DbPostLike[]>(
      supabase.from('post_likes').select('*'),
      'listPostLikes'
    );
    return rows.map(mapPostLikeFromDb);
  },

  subscribeToPostLikes(callback: (likes: PostLike[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbPostLike[]>(
        supabase.from('post_likes').select('*'),
        'subscribeToPostLikes'
      );
      return rows.map(mapPostLikeFromDb);
    };
    return subscribeToTable('post_likes', fetcher, callback);
  },

  async setPostLike(postId: string, userUid: string, shouldLike: boolean): Promise<void> {
    const existingRows = await runQuery<Pick<DbPostLike, 'id'>[]>(
      supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_uid', userUid),
      'setPostLike:existing'
    );

    if (!shouldLike) {
      if (existingRows.length === 0) return;
      const existingIds = existingRows.map((row) => row.id);
      await runQuery(
        supabase.from('post_likes').delete().in('id', existingIds),
        'setPostLike:delete'
      );
      return;
    }

    if (existingRows.length === 0) {
      await runQuery(
        supabase.from('post_likes').insert({
          post_id: postId,
          user_uid: userUid,
          created_at: new Date().toISOString(),
        }),
        'setPostLike:insert'
      );
      return;
    }

    if (existingRows.length > 1) {
      const duplicateIds = existingRows.slice(1).map((row) => row.id);
      await runQuery(
        supabase.from('post_likes').delete().in('id', duplicateIds),
        'setPostLike:dedupe'
      );
    }
  },

  async listPostComments(postId: string): Promise<PostComment[]> {
    const rows = await runQuery<DbPostComment[]>(
      supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
      'listPostComments'
    );
    return rows.map(mapPostCommentFromDb);
  },

  async listAllPostComments(): Promise<PostComment[]> {
    const rows = await runQuery<DbPostComment[]>(
      supabase.from('post_comments').select('*'),
      'listAllPostComments'
    );
    return rows.map(mapPostCommentFromDb);
  },

  subscribeToAllPostComments(callback: (comments: PostComment[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbPostComment[]>(
        supabase.from('post_comments').select('*'),
        'subscribeToAllPostComments'
      );
      return rows.map(mapPostCommentFromDb);
    };
    return subscribeToTable('post_comments', fetcher, callback);
  },

  subscribeToPostComments(postId: string, callback: (comments: PostComment[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbPostComment[]>(
        supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
        'subscribeToPostComments'
      );
      return rows.map(mapPostCommentFromDb);
    };
    return subscribeToTable('post_comments', fetcher, callback, `post_id=eq.${postId}`);
  },

  async addPostComment(postId: string, author: UserProfile, content: string): Promise<void> {
    await runQuery(
      supabase.from('post_comments').insert({
        post_id: postId,
        user_uid: author.uid,
        author_name: author.displayName,
        author_photo: author.photoURL,
        content,
        created_at: new Date().toISOString(),
      }),
      'addPostComment'
    );
  },

  // Jobs
  async createJob(job: Omit<Job, 'id' | 'createdAt' | 'status'>): Promise<void> {
    await runQuery(
      supabase.from('jobs').insert({
        client_uid: job.clientUid,
        title: job.title,
        description: job.description,
        budget: job.budget,
        category: job.category,
        is_student_friendly: job.isStudentFriendly,
        is_remote: job.isRemote,
        status: 'open',
        created_at: new Date().toISOString(),
      }),
      'createJob'
    );
  },

  async listJobs(): Promise<Job[]> {
    const rows = await runQuery<DbJob[]>(
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      'listJobs'
    );
    return rows.map(mapJobFromDb);
  },

  async getJobById(jobId: string): Promise<Job | null> {
    const row = await runQuery<DbJob | null>(
      supabase.from('jobs').select('*').eq('id', jobId).maybeSingle(),
      'getJobById'
    );
    return row ? mapJobFromDb(row) : null;
  },

  subscribeToJobs(callback: (jobs: Job[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbJob[]>(
        supabase.from('jobs').select('*').order('created_at', { ascending: false }),
        'subscribeToJobs'
      );
      return rows.map(mapJobFromDb);
    };
    return subscribeToTable('jobs', fetcher, callback);
  },

  // Messages
  async uploadFile(file: File, folder: string = 'chat'): Promise<Attachment> {
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    await runQuery(
      supabase.storage.from('chat-attachments').upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      }),
      'uploadFile'
    );

    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
    return {
      name: file.name,
      url: data.publicUrl,
      type: file.type,
      size: file.size,
    };
  },

  async uploadUserAsset(file: File, folder: string = 'profile'): Promise<string> {
    const safeName = file.name.replace(/\s+/g, '_');
    const filePath = `${folder}/${Date.now()}_${safeName}`;
    await runQuery(
      supabase.storage.from('chat-attachments').upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      }),
      'uploadUserAsset'
    );

    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const createdAt = new Date().toISOString();
    const inserted = await runQuery<DbMessage>(
      supabase
        .from('messages')
        .insert({
          sender_uid: message.senderUid,
          receiver_uid: message.receiverUid,
          content: message.content || null,
          attachments: message.attachments || null,
          created_at: createdAt,
        })
        .select('*')
        .single(),
      'sendMessage'
    );

    const lastMessageText =
      message.content || (message.attachments && message.attachments.length > 0 ? 'Attachment' : '');

    await runQuery(
      supabase.from('active_chats').upsert(
        [
          {
            user_uid: message.senderUid,
            other_uid: message.receiverUid,
            last_message: lastMessageText,
            updated_at: createdAt,
          },
          {
            user_uid: message.receiverUid,
            other_uid: message.senderUid,
            last_message: lastMessageText,
            updated_at: createdAt,
          },
        ],
        { onConflict: 'user_uid,other_uid' }
      ),
      'updateActiveChats'
    );

    return mapMessageFromDb(inserted);
  },

  subscribeToMessages(
    uid: string,
    otherUid: string,
    callback: (messages: Message[]) => void,
    onError?: (error: any) => void
  ) {
    const fetcher = async () => {
      try {
        const rows = await runQuery<DbMessage[]>(
          supabase
            .from('messages')
            .select('*')
            .or(`and(sender_uid.eq.${uid},receiver_uid.eq.${otherUid}),and(sender_uid.eq.${otherUid},receiver_uid.eq.${uid})`)
            .order('created_at', { ascending: true })
            .limit(100),
          'subscribeToMessages'
        );
        return rows.map(mapMessageFromDb);
      } catch (error) {
        if (onError) onError(error);
        throw error;
      }
    };

    return subscribeToTable('messages', fetcher, callback, undefined);
  },

  async fetchActiveChats(uid: string) {
    const rows = await runQuery<any[]>(
      supabase
        .from('active_chats')
        .select('*')
        .eq('user_uid', uid)
        .order('updated_at', { ascending: false })
        .limit(50),
      'fetchActiveChats'
    );

    const otherUids = rows.map((r) => r.other_uid as string);
    if (otherUids.length === 0) return [];

    const profiles = await this.getUsersByUids(otherUids);
    const profileMap = new Map(profiles.map((p) => [p.uid, p]));

    return rows
      .map((chat) => {
        const user = profileMap.get(chat.other_uid);
        if (!user) return null;
        return {
          lastMessage: chat.last_message as string,
          updatedAt: chat.updated_at as string,
          otherUid: chat.other_uid as string,
          user,
        };
      })
      .filter((c): c is any => c !== null);
  },

  subscribeToActiveChats(uid: string, callback: (chats: any[]) => void, onError?: (error: any) => void) {
    const fetcher = async () => this.fetchActiveChats(uid);
    return subscribeToTable('active_chats', fetcher, callback, `user_uid=eq.${uid}`, onError);
  },

  async getRecentConversations(uid: string) {
    const rows = await runQuery<DbMessage[]>(
      supabase
        .from('messages')
        .select('*')
        .or(`sender_uid.eq.${uid},receiver_uid.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(200),
      'getRecentConversations'
    );

    const convoMap = new Map<string, { lastMessage: string; updatedAt: string }>();
    rows.forEach((msg) => {
      const otherUid = msg.sender_uid === uid ? msg.receiver_uid : msg.sender_uid;
      if (!convoMap.has(otherUid)) {
        convoMap.set(otherUid, {
          lastMessage: msg.content || (msg.attachments && msg.attachments.length > 0 ? 'Attachment' : ''),
          updatedAt: msg.created_at,
        });
      }
    });

    const otherUids = Array.from(convoMap.keys());
    if (otherUids.length === 0) return [];

    const profiles = await this.getUsersByUids(otherUids);
    const profileMap = new Map(profiles.map((p) => [p.uid, p]));

    return otherUids
      .map((otherUid) => {
        const user = profileMap.get(otherUid);
        if (!user) return null;
        const convo = convoMap.get(otherUid)!;
        return {
          otherUid,
          user,
          lastMessage: convo.lastMessage,
          updatedAt: convo.updatedAt,
        };
      })
      .filter((c): c is any => c !== null);
  },

  // Friend Requests
  subscribeToIncomingFriendRequests(uid: string, callback: (requests: FriendRequest[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbFriendRequest[]>(
        supabase
          .from('friend_requests')
          .select('*')
          .eq('to_uid', uid)
          .order('created_at', { ascending: false }),
        'subscribeToIncomingFriendRequests'
      );
      return rows.map(mapFriendRequestFromDb);
    };
    return subscribeToTable('friend_requests', fetcher, callback, `to_uid=eq.${uid}`);
  },

  subscribeToOutgoingFriendRequests(uid: string, callback: (requests: FriendRequest[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbFriendRequest[]>(
        supabase
          .from('friend_requests')
          .select('*')
          .eq('from_uid', uid)
          .order('created_at', { ascending: false }),
        'subscribeToOutgoingFriendRequests'
      );
      return rows.map(mapFriendRequestFromDb);
    };
    return subscribeToTable('friend_requests', fetcher, callback, `from_uid=eq.${uid}`);
  },

  async sendFriendRequest(targetUser: UserProfile, myProfile: UserProfile): Promise<void> {
    await runQuery(
      supabase.from('friend_requests').insert({
        from_uid: myProfile.uid,
        from_name: myProfile.displayName,
        from_photo: myProfile.photoURL,
        to_uid: targetUser.uid,
        status: 'pending',
        created_at: new Date().toISOString(),
      }),
      'sendFriendRequest'
    );
  },

  async deleteFriendRequest(requestId: string): Promise<void> {
    await runQuery(
      supabase.from('friend_requests').delete().eq('id', requestId),
      'deleteFriendRequest'
    );
  },

  async acceptFriendRequest(request: FriendRequest, myProfile: UserProfile): Promise<void> {
    const timestamp = new Date().toISOString();
    await runQuery(
      supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', request.id),
      'acceptFriendRequest:update'
    );

    await runQuery(
      supabase.from('connections').insert({
        uids: [myProfile.uid, request.fromUid],
        created_at: timestamp,
      }),
      'acceptFriendRequest:connection'
    );

    await runQuery(
      supabase.from('active_chats').upsert(
        [
          {
            user_uid: myProfile.uid,
            other_uid: request.fromUid,
            last_message: 'You are now connected! Say hi.',
            updated_at: timestamp,
          },
          {
            user_uid: request.fromUid,
            other_uid: myProfile.uid,
            last_message: 'You are now connected! Say hi.',
            updated_at: timestamp,
          },
        ],
        { onConflict: 'user_uid,other_uid' }
      ),
      'acceptFriendRequest:activeChats'
    );
  },

  async rejectFriendRequest(requestId: string): Promise<void> {
    await runQuery(
      supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId),
      'rejectFriendRequest'
    );
  },

  subscribeToConnections(uid: string, callback: (connections: Connection[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbConnection[]>(
        supabase.from('connections').select('*').contains('uids', [uid]),
        'subscribeToConnections'
      );
      return rows.map(mapConnectionFromDb);
    };
    return subscribeToTable('connections', fetcher, callback);
  },

  async getFriends(uid: string): Promise<UserProfile[]> {
    const connections = await runQuery<DbConnection[]>(
      supabase.from('connections').select('*').contains('uids', [uid]),
      'getFriends:connections'
    );
    const otherUids = connections.flatMap((c) => c.uids.filter((id) => id !== uid));
    if (otherUids.length === 0) return [];
    return this.getUsersByUids(otherUids);
  },

  // Wallets
  async getOrCreateWallet(uid: string): Promise<Wallet> {
    const existing = await runQuery<DbWallet | null>(
      supabase.from('wallets').select('*').eq('user_uid', uid).maybeSingle(),
      'getOrCreateWallet'
    );

    if (existing) return mapWalletFromDb(existing);

    const created = await runQuery<DbWallet>(
      supabase
        .from('wallets')
        .insert({
          user_uid: uid,
          usd_balance: 0,
          ngn_balance: 0,
          eur_balance: 0,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single(),
      'createWallet'
    );

    return mapWalletFromDb(created);
  },

  async listWalletTransactions(uid: string): Promise<WalletTransaction[]> {
    const rows = await runQuery<DbWalletTransaction[]>(
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_uid', uid)
        .order('created_at', { ascending: false })
        .limit(100),
      'listWalletTransactions'
    );
    return rows.map(mapWalletTransactionFromDb);
  },

  async hasTransactionPin(uid: string): Promise<boolean> {
    const row = await runQuery<Pick<DbWalletSecurity, 'user_uid'> | null>(
      supabase.from('wallet_security').select('user_uid').eq('user_uid', uid).maybeSingle(),
      'hasTransactionPin'
    );
    return !!row;
  },

  async setTransactionPin(uid: string, nextPin: string, currentPin?: string): Promise<void> {
    if (!/^\d{4}$/.test(nextPin)) {
      throw new Error('PIN must be exactly 4 digits.');
    }

    const existing = await runQuery<DbWalletSecurity | null>(
      supabase.from('wallet_security').select('*').eq('user_uid', uid).maybeSingle(),
      'setTransactionPin:existing'
    );

    if (existing) {
      if (!currentPin || !/^\d{4}$/.test(currentPin)) {
        throw new Error('Current PIN is required.');
      }
      const currentHash = await hashPin(currentPin);
      if (currentHash !== existing.pin_hash) {
        throw new Error('Current PIN is incorrect.');
      }
    }

    const nextHash = await hashPin(nextPin);
    await runQuery(
      supabase.from('wallet_security').upsert(
        {
          user_uid: uid,
          pin_hash: nextHash,
          updated_at: new Date().toISOString(),
          created_at: existing?.created_at || new Date().toISOString(),
        },
        { onConflict: 'user_uid' }
      ),
      'setTransactionPin:upsert'
    );
  },

  async verifyTransactionPin(uid: string, pin: string): Promise<boolean> {
    if (!/^\d{4}$/.test(pin)) return false;
    const row = await runQuery<DbWalletSecurity | null>(
      supabase.from('wallet_security').select('*').eq('user_uid', uid).maybeSingle(),
      'verifyTransactionPin'
    );
    if (!row) return false;
    const incomingHash = await hashPin(pin);
    return incomingHash === row.pin_hash;
  },

  async topUpWallet(uid: string, currency: WalletCurrency, amount: number, method: 'card' | 'transfer') {
    const wallet = await this.getOrCreateWallet(uid);
    const nextBalances = {
      usd_balance: wallet.usdBalance + (currency === 'USD' ? amount : 0),
      ngn_balance: wallet.ngnBalance + (currency === 'NGN' ? amount : 0),
      eur_balance: wallet.eurBalance + (currency === 'EUR' ? amount : 0),
    };

    await runQuery(
      supabase
        .from('wallets')
        .update({ ...nextBalances, updated_at: new Date().toISOString() })
        .eq('user_uid', uid),
      'topUpWallet:update'
    );

    await runQuery(
      supabase.from('wallet_transactions').insert({
        user_uid: uid,
        currency,
        type: 'topup',
        method,
        amount,
        status: 'completed',
        created_at: new Date().toISOString(),
      }),
      'topUpWallet:transaction'
    );
  },

  async withdrawFromWallet(uid: string, currency: WalletCurrency, amount: number, method: 'card' | 'transfer') {
    const wallet = await this.getOrCreateWallet(uid);
    const current = currency === 'USD' ? wallet.usdBalance : currency === 'NGN' ? wallet.ngnBalance : wallet.eurBalance;
    if (amount > current) {
      throw new Error('Insufficient balance.');
    }

    const nextBalances = {
      usd_balance: wallet.usdBalance - (currency === 'USD' ? amount : 0),
      ngn_balance: wallet.ngnBalance - (currency === 'NGN' ? amount : 0),
      eur_balance: wallet.eurBalance - (currency === 'EUR' ? amount : 0),
    };

    await runQuery(
      supabase
        .from('wallets')
        .update({ ...nextBalances, updated_at: new Date().toISOString() })
        .eq('user_uid', uid),
      'withdrawWallet:update'
    );

    await runQuery(
      supabase.from('wallet_transactions').insert({
        user_uid: uid,
        currency,
        type: 'withdraw',
        method,
        amount,
        status: 'completed',
        created_at: new Date().toISOString(),
      }),
      'withdrawWallet:transaction'
    );
  },

  async transferByUserId(senderUid: string, recipientIdentifier: string, currency: WalletCurrency, amount: number) {
    const normalizedRecipient = recipientIdentifier.trim();
    if (!normalizedRecipient) {
      throw new Error('Recipient user ID is required.');
    }
    if (senderUid === normalizedRecipient) {
      throw new Error('You cannot transfer funds to yourself.');
    }
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    const recipientProfile = await this.resolveUserByIdentifier(normalizedRecipient);
    if (!recipientProfile) {
      throw new Error('Recipient user ID was not found.');
    }
    const recipientUid = recipientProfile.uid;
    if (senderUid === recipientUid) {
      throw new Error('You cannot transfer funds to yourself.');
    }

    const [senderWallet, recipientWallet] = await Promise.all([
      this.getOrCreateWallet(senderUid),
      this.getOrCreateWallet(recipientUid),
    ]);

    const senderCurrent =
      currency === 'USD' ? senderWallet.usdBalance : currency === 'NGN' ? senderWallet.ngnBalance : senderWallet.eurBalance;
    if (amount > senderCurrent) {
      throw new Error('Insufficient balance.');
    }

    const senderNextBalances = {
      usd_balance: senderWallet.usdBalance - (currency === 'USD' ? amount : 0),
      ngn_balance: senderWallet.ngnBalance - (currency === 'NGN' ? amount : 0),
      eur_balance: senderWallet.eurBalance - (currency === 'EUR' ? amount : 0),
    };

    const recipientNextBalances = {
      usd_balance: recipientWallet.usdBalance + (currency === 'USD' ? amount : 0),
      ngn_balance: recipientWallet.ngnBalance + (currency === 'NGN' ? amount : 0),
      eur_balance: recipientWallet.eurBalance + (currency === 'EUR' ? amount : 0),
    };

    const timestamp = new Date().toISOString();
    const transferRef = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await runQuery(
      supabase.from('wallets').update({ ...senderNextBalances, updated_at: timestamp }).eq('user_uid', senderUid),
      'transferWallet:updateSender'
    );

    await runQuery(
      supabase.from('wallets').update({ ...recipientNextBalances, updated_at: timestamp }).eq('user_uid', recipientUid),
      'transferWallet:updateRecipient'
    );

    await runQuery(
      supabase.from('wallet_transactions').insert([
        {
          user_uid: senderUid,
          currency,
          type: 'withdraw',
          method: 'transfer',
          amount,
          status: 'completed',
          reference: `transfer_out:${recipientUid}:${transferRef}`,
          created_at: timestamp,
        },
        {
          user_uid: recipientUid,
          currency,
          type: 'topup',
          method: 'transfer',
          amount,
          status: 'completed',
          reference: `transfer_in:${senderUid}:${transferRef}`,
          created_at: timestamp,
        },
      ]),
      'transferWallet:transactions'
    );
  },

  async transferByUserIdWithPin(
    senderUid: string,
    recipientIdentifier: string,
    currency: WalletCurrency,
    amount: number,
    pin: string
  ) {
    const { error } = await supabase.rpc('wallet_transfer_with_pin', {
      p_recipient_identifier: recipientIdentifier.trim(),
      p_currency: currency,
      p_amount: amount,
      p_pin: pin,
    });
    if (error) {
      throw new Error(error.message || 'Transfer failed.');
    }
  },

  // Client Job Management
  subscribeToClientJobs(clientUid: string, callback: (jobs: Job[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbJob[]>(
        supabase
          .from('jobs')
          .select('*')
          .eq('client_uid', clientUid)
          .order('created_at', { ascending: false }),
        'subscribeToClientJobs'
      );
      return rows.map(mapJobFromDb);
    };
    return subscribeToTable('jobs', fetcher, callback, `client_uid=eq.${clientUid}`);
  },

  async updateJobStatus(jobId: string, status: 'open' | 'closed'): Promise<void> {
    await runQuery(
      supabase.from('jobs').update({ status }).eq('id', jobId),
      'updateJobStatus'
    );
  },

  async deleteJob(jobId: string): Promise<void> {
    await runQuery(
      supabase.from('jobs').delete().eq('id', jobId),
      'deleteJob'
    );
  },

  // Proposals
  subscribeToJobProposals(jobId: string, callback: (proposals: Proposal[]) => void) {
    const fetcher = async () => {
      const rows = await runQuery<DbProposal[]>(
        supabase
          .from('proposals')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false }),
        'subscribeToJobProposals'
      );
      return rows.map(mapProposalFromDb);
    };
    return subscribeToTable('proposals', fetcher, callback, `job_id=eq.${jobId}`);
  },

  async createProposal(proposal: Omit<Proposal, 'id' | 'createdAt' | 'status'>): Promise<void> {
    await runQuery(
      supabase.from('proposals').insert({
        freelancer_uid: proposal.freelancerUid,
        job_id: proposal.jobId,
        content: proposal.content,
        budget: proposal.budget,
        status: 'pending',
        created_at: new Date().toISOString(),
      }),
      'createProposal'
    );
  },

  async updateProposalStatus(proposalId: string, status: 'pending' | 'accepted' | 'rejected') {
    await runQuery(
      supabase.from('proposals').update({ status }).eq('id', proposalId),
      'updateProposalStatus'
    );
  },

  async hasAppliedToJob(jobId: string, freelancerUid: string): Promise<boolean> {
    const row = await runQuery<DbProposal | null>(
      supabase
        .from('proposals')
        .select('*')
        .eq('job_id', jobId)
        .eq('freelancer_uid', freelancerUid)
        .maybeSingle(),
      'hasAppliedToJob'
    );
    return !!row;
  },

  async getNotifications(uid: string): Promise<AppNotification[]> {
    const settings = this.getNotificationSettings(uid);

    const [incomingRequests, proposals, myJobs, walletTransactions, feedLikes, feedComments] = await Promise.all([
      runQuery<DbFriendRequest[]>(
        supabase.from('friend_requests').select('*').eq('to_uid', uid).order('created_at', { ascending: false }).limit(20),
        'notifications:friendRequests'
      ),
      runQuery<DbProposal[]>(
        supabase.from('proposals').select('*').order('created_at', { ascending: false }).limit(30),
        'notifications:proposals'
      ),
      runQuery<DbJob[]>(
        supabase.from('jobs').select('*').eq('client_uid', uid),
        'notifications:myJobs'
      ),
      runQuery<DbWalletTransaction[]>(
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_uid', uid)
          .order('created_at', { ascending: false })
          .limit(20),
        'notifications:walletTransactions'
      ),
      settings.feed
        ? runQuery<DbPostLikeNotificationRow[]>(
            supabase
              .from('post_likes')
              .select('id,post_id,user_uid,created_at,posts!inner(author_uid)')
              .eq('posts.author_uid', uid)
              .neq('user_uid', uid)
              .order('created_at', { ascending: false })
              .limit(20),
            'notifications:feedLikes'
          )
        : Promise.resolve([]),
      settings.feed
        ? runQuery<DbPostCommentNotificationRow[]>(
            supabase
              .from('post_comments')
              .select('id,post_id,user_uid,author_name,content,created_at,posts!inner(author_uid)')
              .eq('posts.author_uid', uid)
              .neq('user_uid', uid)
              .order('created_at', { ascending: false })
              .limit(20),
            'notifications:feedComments'
          )
        : Promise.resolve([]),
    ]);

    const myJobIds = new Set(myJobs.map((j) => j.id));
    const gigNotifications = settings.gigs
      ? proposals
      .filter((p) => myJobIds.has(p.job_id))
      .slice(0, 20)
      .map<AppNotification>((p) => ({
        id: `proposal-${p.id}`,
        type: 'gig',
        title: 'New job application received',
        body: p.content.slice(0, 110),
        createdAt: p.created_at,
        link: '/manage-gigs',
      }))
      : [];

    const requestNotifications = settings.friendRequests
      ? incomingRequests.slice(0, 20).map<AppNotification>((r) => ({
          id: `friend-${r.id}`,
          type: 'friend_request',
          title: `${r.from_name} sent you a request`,
          body: r.status === 'pending' ? 'Tap to review connection request.' : `Request ${r.status}.`,
          createdAt: r.created_at,
          link: '/requests',
        }))
      : [];

    const walletNotifications = settings.wallet
      ? walletTransactions.map<AppNotification>((tx) => {
          const isTransferOut = tx.reference?.startsWith('transfer_out:');
          const isTransferIn = tx.reference?.startsWith('transfer_in:');
          const counterpartyUid = tx.reference?.split(':')[1];
          const title = isTransferIn
            ? 'Funds received'
            : isTransferOut
            ? 'Transfer sent'
            : tx.type === 'topup'
            ? 'Wallet funded'
            : 'Withdrawal completed';
          const body = isTransferIn || isTransferOut
            ? `${tx.amount} ${tx.currency} ${isTransferIn ? 'from' : 'to'} user ${counterpartyUid || ''}`.trim()
            : `${tx.amount} ${tx.currency} via ${tx.method}`;
          return {
            id: `wallet-${tx.id}`,
            type: 'wallet',
            title,
            body,
            createdAt: tx.created_at,
            link: '/wallets',
          };
        })
      : [];

    const feedLikeNotifications = feedLikes.map<AppNotification>((like) => ({
      id: `feed-like-${like.id}`,
      type: 'feed',
      title: 'New like on your post',
      body: 'Someone liked your post.',
      createdAt: like.created_at,
      link: `/comments/${like.post_id}`,
    }));

    const feedCommentNotifications = feedComments.map<AppNotification>((comment) => ({
      id: `feed-comment-${comment.id}`,
      type: 'feed',
      title: 'New comment on your post',
      body: `${comment.author_name}: ${comment.content.slice(0, 90)}`,
      createdAt: comment.created_at,
      link: `/comments/${comment.post_id}`,
    }));

    return [
      ...requestNotifications,
      ...gigNotifications,
      ...walletNotifications,
      ...feedLikeNotifications,
      ...feedCommentNotifications,
    ].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  subscribeToNotifications(uid: string, callback: (items: AppNotification[]) => void, onError?: (error: any) => void) {
    let active = true;

    const refresh = async () => {
      try {
        const items = await this.getNotifications(uid);
        if (active) callback(items);
      } catch (error) {
        if (onError) onError(error);
      }
    };

    refresh();

    const channels = [
      supabase.channel(`realtime:friend_requests:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        refresh
      ),
      supabase.channel(`realtime:proposals:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals' },
        refresh
      ),
      supabase.channel(`realtime:jobs:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        refresh
      ),
      supabase.channel(`realtime:wallet_transactions:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_uid=eq.${uid}` },
        refresh
      ),
      supabase.channel(`realtime:post_likes:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        refresh
      ),
      supabase.channel(`realtime:post_comments:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        refresh
      ),
    ];

    channels.forEach((channel) => channel.subscribe());
    const interval = setInterval(refresh, 30000);

    return () => {
      active = false;
      clearInterval(interval);
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  },
};
