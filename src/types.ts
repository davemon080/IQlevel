export type UserRole = 'freelancer' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  coverPhotoURL?: string;
  role: UserRole;
  bio?: string;
  status?: string;
  location?: string;
  skills?: string[];
  education?: {
    university: string;
    degree: string;
    year?: string;
    verified: boolean;
  };
  experience?: {
    title: string;
    company: string;
    type: string;
    period: string;
    description: string;
  }[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
  portfolio?: {
    title: string;
    imageUrl: string;
    link: string;
  }[];
  companyInfo?: {
    name: string;
    about: string;
  };
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  type: 'social' | 'job';
  createdAt: string;
}

export interface Job {
  id: string;
  clientUid: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  isStudentFriendly: boolean;
  isRemote: boolean;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  senderUid: string;
  receiverUid: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface Proposal {
  id: string;
  freelancerUid: string;
  jobId: string;
  content: string;
  budget: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromPhoto: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Connection {
  id: string;
  uids: string[];
  createdAt: string;
}
