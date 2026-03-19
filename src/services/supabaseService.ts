import { supabase } from '../supabase';
import { UserProfile, Post, Job, Message, Proposal, Attachment, FriendRequest, Connection } from '../types';

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

async function runQuery<T>(promise: Promise<{ data: T | null; error: any }>, context: string): Promise<T> {
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
  async createPost(post: Omit<Post, 'id' | 'createdAt'>): Promise<void> {
    await runQuery(
      supabase.from('posts').insert({
        author_uid: post.authorUid,
        author_name: post.authorName,
        author_photo: post.authorPhoto,
        content: post.content,
        image_url: post.imageUrl || null,
        type: post.type,
        created_at: new Date().toISOString(),
      }),
      'createPost'
    );
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

  async sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<void> {
    const createdAt = new Date().toISOString();
    await runQuery(
      supabase.from('messages').insert({
        sender_uid: message.senderUid,
        receiver_uid: message.receiverUid,
        content: message.content || null,
        attachments: message.attachments || null,
        created_at: createdAt,
      }),
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
};
