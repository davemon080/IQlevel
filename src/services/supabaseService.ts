import { supabase } from '../supabase';
import { UserProfile, Post, Job, Message, Proposal, Attachment, FriendRequest, Connection, Wallet, WalletTransaction, WalletCurrency, AppNotification, PostLike, PostComment } from '../types';

type DbUserProfile = {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string;
  cover_photo_url?: string | null;
  role: 'freelancer' | 'client' | 'admin';
  bio?: string | null;
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

function mapUserProfileFromDb(row: DbUserProfile): UserProfile {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    coverPhotoURL: row.cover_photo_url || undefined,
    role: row.role === 'admin' ? 'client' : row.role,
    bio: row.bio || undefined,
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
    email: data.email,
    display_name: data.displayName,
    photo_url: data.photoURL,
    cover_photo_url: data.coverPhotoURL ?? null,
    role: data.role as DbUserProfile['role'] | undefined,
    bio: data.bio ?? null,
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

function subscribeToTable<T>(
  table: string,
  fetcher: () => Promise<T>,
  callback: (data: T) => void,
  filter?: string,
  onError?: (error: any) => void
) {
  let active = true;
  fetcher()
    .then((data) => {
      if (active) callback(data);
    })
    .catch((error) => {
      console.error(`Supabase fetch error (${table}):`, error);
      if (onError) onError(error);
    });

  const channel = supabase
    .channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      () => {
        fetcher()
          .then((data) => {
            if (active) callback(data);
          })
          .catch((error) => {
            console.error(`Supabase realtime error (${table}):`, error);
            if (onError) onError(error);
          });
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export const supabaseService = {
  profileCache: new Map<string, UserProfile>(),

  // User Profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const data = await runQuery<DbUserProfile | null>(
      supabase.from('users').select('*').eq('uid', uid).maybeSingle(),
      `getUserProfile:${uid}`
    );
    return data ? mapUserProfileFromDb(data) : null;
  },

  async createUserProfile(profile: UserProfile): Promise<void> {
    const payload = mapUserProfileToDb(profile) as DbUserProfile;
    await runQuery(
      supabase.from('users').upsert(
        { ...payload, created_at: new Date().toISOString() },
        { onConflict: 'uid' }
      ),
      'createUserProfile'
    );
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const payload = mapUserProfileToDb(data);
    await runQuery(
      supabase.from('users').update(payload).eq('uid', uid),
      'updateUserProfile'
    );
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
    return rows.map(mapUserProfileFromDb);
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const rows = await runQuery<DbUserProfile[]>(
      supabase.from('users').select('*'),
      'getAllUsers'
    );
    return rows.map(mapUserProfileFromDb);
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

  async togglePostLike(postId: string, userUid: string): Promise<void> {
    const existing = await runQuery<DbPostLike | null>(
      supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_uid', userUid).maybeSingle(),
      'togglePostLike:check'
    );

    if (existing) {
      await runQuery(
        supabase.from('post_likes').delete().eq('id', existing.id),
        'togglePostLike:delete'
      );
      return;
    }

    await runQuery(
      supabase.from('post_likes').insert({
        post_id: postId,
        user_uid: userUid,
        created_at: new Date().toISOString(),
      }),
      'togglePostLike:create'
    );
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

    const profiles = await runQuery<DbUserProfile[]>(
      supabase.from('users').select('*').in('uid', otherUids),
      'fetchActiveChatProfiles'
    );
    const profileMap = new Map(profiles.map((p) => [p.uid, mapUserProfileFromDb(p)]));

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

    const profiles = await runQuery<DbUserProfile[]>(
      supabase.from('users').select('*').in('uid', otherUids),
      'getRecentConversations:profiles'
    );
    const profileMap = new Map(profiles.map((p) => [p.uid, mapUserProfileFromDb(p)]));

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
    const rows = await runQuery<DbUserProfile[]>(
      supabase.from('users').select('*').in('uid', otherUids),
      'getFriends:users'
    );
    return rows.map(mapUserProfileFromDb);
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

  async transferByUserId(senderUid: string, recipientUid: string, currency: WalletCurrency, amount: number) {
    if (!recipientUid.trim()) {
      throw new Error('Recipient user ID is required.');
    }
    if (senderUid === recipientUid) {
      throw new Error('You cannot transfer funds to yourself.');
    }
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    const recipientProfile = await this.getUserProfile(recipientUid);
    if (!recipientProfile) {
      throw new Error('Recipient user ID not found.');
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
    const [incomingRequests, activeChats, proposals, myJobs] = await Promise.all([
      runQuery<DbFriendRequest[]>(
        supabase.from('friend_requests').select('*').eq('to_uid', uid).order('created_at', { ascending: false }).limit(20),
        'notifications:friendRequests'
      ),
      runQuery<any[]>(
        supabase.from('active_chats').select('*').eq('user_uid', uid).order('updated_at', { ascending: false }).limit(20),
        'notifications:activeChats'
      ),
      runQuery<DbProposal[]>(
        supabase.from('proposals').select('*').order('created_at', { ascending: false }).limit(30),
        'notifications:proposals'
      ),
      runQuery<DbJob[]>(
        supabase.from('jobs').select('*').eq('client_uid', uid),
        'notifications:myJobs'
      ),
    ]);

    const myJobIds = new Set(myJobs.map((j) => j.id));
    const appNotifications = proposals
      .filter((p) => myJobIds.has(p.job_id))
      .slice(0, 20)
      .map<AppNotification>((p) => ({
        id: `proposal-${p.id}`,
        type: 'application',
        title: 'New job application received',
        body: p.content.slice(0, 110),
        createdAt: p.created_at,
        link: '/manage-gigs',
      }));

    const requestNotifications = incomingRequests.slice(0, 20).map<AppNotification>((r) => ({
      id: `friend-${r.id}`,
      type: 'friend_request',
      title: `${r.from_name} sent you a request`,
      body: r.status === 'pending' ? 'Tap to review connection request.' : `Request ${r.status}.`,
      createdAt: r.created_at,
      link: '/requests',
    }));

    const messageNotifications = activeChats.slice(0, 20).map<AppNotification>((c) => ({
      id: `chat-${c.user_uid}-${c.other_uid}-${c.updated_at}`,
      type: 'message',
      title: 'New chat activity',
      body: c.last_message || 'You have a new message.',
      createdAt: c.updated_at,
      link: `/messages?uid=${c.other_uid}`,
    }));

    return [...requestNotifications, ...messageNotifications, ...appNotifications].sort(
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
      supabase.channel(`realtime:active_chats:${uid}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_chats', filter: `user_uid=eq.${uid}` },
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
