import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserProfile, Message, Attachment } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Send, Search, MessageSquare, MoreVertical, ArrowLeft, Smile, PlusSquare, Lock, FileIcon, X, Download, Image as ImageIcon, Loader2, Check, Video, CircleDollarSign } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import CachedImage from './CachedImage';

interface ChatProps {
  profile: UserProfile;
}

type LocalMessage = Message & { localStatus?: 'pending' | 'sent' | 'failed' };
type ChatSummary = {
  otherUid: string;
  user: UserProfile;
  lastMessage: string;
  updatedAt: string;
};

export default function Chat({ profile }: ChatProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUid = searchParams.get('uid');
  
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChats, setActiveChats] = useState<ChatSummary[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const uploading = activeUploads > 0;
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [presenceState, setPresenceState] = useState<Record<string, { userUid: string; onlineAt?: string; visibilityState?: string; typingTo?: string | null; viewingChatUid?: string | null; updatedAt?: string }>>({});
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [chatActionsUser, setChatActionsUser] = useState<UserProfile | null>(null);
  const [messageActionsMessage, setMessageActionsMessage] = useState<LocalMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showKeyboardDock, setShowKeyboardDock] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const quickKeyboardActions = ['Hello', 'Thanks', 'On it', 'Can we talk?', 'I have an update', 'Please check this'];

  const mergeChats = React.useCallback((incomingChats: ChatSummary[], recentChats: ChatSummary[] = []) => {
    const merged = new Map<string, ChatSummary>();
    [...incomingChats, ...recentChats].forEach((chat) => {
      if (!chat?.otherUid || !chat?.user?.uid || !chat.user.displayName) return;
      const existing = merged.get(chat.otherUid);
      if (!existing) {
        merged.set(chat.otherUid, chat);
        return;
      }

      if (new Date(chat.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
        merged.set(chat.otherUid, chat);
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, []);

  const upsertLocalChat = React.useCallback((chat: ChatSummary) => {
    setActiveChats((prev) => mergeChats([chat], prev));
  }, [mergeChats]);

  const clearUnreadForChat = React.useCallback((otherUid: string) => {
    setUnreadCounts((prev) => {
      if (!prev[otherUid]) return prev;
      const next = { ...prev };
      delete next[otherUid];
      return next;
    });
  }, []);

  const getPreviewText = React.useCallback((message?: Pick<Message, 'content' | 'attachments'> | null) => {
    if (!message) return '';
    const content = message.content?.trim();
    if (content) return content;
    if (message.attachments && message.attachments.length > 0) {
      return message.attachments.length > 1 ? 'Attachments' : 'Attachment';
    }
    return '';
  }, []);

  const openChat = React.useCallback((user: UserProfile, options?: { otherUid?: string; lastMessage?: string; updatedAt?: string; syncUrl?: boolean }) => {
    const otherUid = options?.otherUid || user.uid;
    setSelectedContact(user);
    setShowChatOnMobile(true);
    upsertLocalChat({
      otherUid,
      user,
      lastMessage: options?.lastMessage || '',
      updatedAt: options?.updatedAt || new Date().toISOString(),
    });
    clearUnreadForChat(otherUid);
    if (options?.syncUrl !== false) {
      setSearchParams({ uid: otherUid });
    }
    supabaseService.markMessagesAsRead(profile.uid, otherUid).catch(() => undefined);
  }, [clearUnreadForChat, profile.uid, setSearchParams, upsertLocalChat]);

  const updateUnreadForChat = React.useCallback((otherUid: string, updater: (current: number) => number) => {
    setUnreadCounts((prev) => {
      const nextValue = Math.max(0, updater(prev[otherUid] || 0));
      if (nextValue === 0) {
        if (!prev[otherUid]) return prev;
        const next = { ...prev };
        delete next[otherUid];
        return next;
      }
      return {
        ...prev,
        [otherUid]: nextValue,
      };
    });
  }, []);

  const findKnownUser = React.useCallback((uid: string) => {
    if (selectedContact?.uid === uid) return selectedContact;
    const activeUser = activeChats.find((chat) => chat.otherUid === uid)?.user;
    if (activeUser) return activeUser;
    const knownUser = allUsers.find((user) => user.uid === uid);
    if (knownUser) return knownUser;
    return supabaseService.profileCache.get(uid) || null;
  }, [activeChats, allUsers, selectedContact]);

  const adjustComposerHeight = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = '0px';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 168)}px`;
  };

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      setViewportHeight(window.visualViewport!.height);
      setViewportOffsetTop(window.visualViewport!.offsetTop);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  useEffect(() => {
    return supabaseService.subscribeToOnlineUsers((uids) => {
      setOnlineUserIds(new Set(uids));
    });
  }, []);

  useEffect(() => {
    return supabaseService.subscribeToPresenceState((state) => {
      setPresenceState(state);
    });
  }, []);

  useEffect(() => {
    return supabaseService.subscribeToUnreadMessageCounts(profile.uid, setUnreadCounts);
  }, [profile.uid]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const virtualKeyboard = (navigator as any).virtualKeyboard;
    if (!virtualKeyboard) return;
    try {
      virtualKeyboard.overlaysContent = false;
    } catch {
      // Ignore unsupported virtual keyboard settings.
    }
  }, []);

  const ensureDate = (date: any): Date => {
    try {
      if (!date) return new Date();
      if (date instanceof Date) return date;
      if (typeof date === 'string') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? new Date() : d;
      }
      return new Date();
    } catch (e) {
      return new Date();
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Loading is taking longer than expected. Please check your connection.");
      }
    }, 15000); // Increased timeout to 15s

    // Subscribe to active chats
    const unsubscribe = supabaseService.subscribeToActiveChats(
      profile.uid, 
      async (chats) => {
        clearTimeout(timeout);
        try {
          const recent = await supabaseService.getRecentConversations(profile.uid);
          setActiveChats(mergeChats(chats, recent));
        } catch (e) {
          setActiveChats(mergeChats(chats));
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        clearTimeout(timeout);
        console.error("Chat subscription error:", err);
        setError("Failed to load conversations. This might be due to a connection issue or missing permissions.");
        setLoading(false);
      }
    );
    
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [mergeChats, profile.uid]);

  // Handle targetUid from search params separately to ensure it updates correctly
  useEffect(() => {
    if (!targetUid) {
      setSelectedContact(null);
      setShowChatOnMobile(false);
      isInitialLoad.current = false;
      return;
    }

    const loadTargetUser = async () => {
      // If we already have the selected contact and it matches targetUid, don't do anything
      if (selectedContact?.uid === targetUid) return;

      // Check if user is already in active chats to avoid extra fetch
      const activeChat = activeChats.find((c) => c.otherUid === targetUid);
      if (activeChat) {
        openChat(activeChat.user, { ...activeChat, syncUrl: false });
      } else if (isInitialLoad.current || !selectedContact) {
        // Fetch user if not in active chats or if it's the initial load
        try {
          const user = await supabaseService.getUserProfile(targetUid);
          if (user) {
            openChat(user, {
              otherUid: user.uid,
              lastMessage: '',
              updatedAt: new Date().toISOString(),
              syncUrl: false,
            });
          }
        } catch (err) {
          console.error('Error loading target user:', err);
          setError('Failed to load user profile');
        }
      }
      isInitialLoad.current = false;
    };

    loadTargetUser();
  }, [targetUid, activeChats, selectedContact, openChat]);

  useEffect(() => {
    if (isNewChatModalOpen) {
      const fetchFriends = async () => {
        const friends = await supabaseService.getFriends(profile.uid);
        setAllUsers(friends);
      };
      fetchFriends();
    }
  }, [isNewChatModalOpen, profile.uid]);

  useEffect(() => {
    return supabaseService.subscribeToMessageEvents(profile.uid, async ({ type, message }) => {
      if (!message || type === 'DELETE') return;

      const otherUid = message.senderUid === profile.uid ? message.receiverUid : message.senderUid;
      const knownUser = findKnownUser(otherUid);
      if (knownUser) {
        upsertLocalChat({
          otherUid,
          user: knownUser,
          lastMessage: getPreviewText(message),
          updatedAt: message.createdAt,
        });
      }

      const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
      const isOpenConversation = selectedContact?.uid === otherUid && (!isMobileViewport || showChatOnMobile);
      if (message.receiverUid === profile.uid) {
        if (isOpenConversation) {
          clearUnreadForChat(otherUid);
          supabaseService.markMessagesAsRead(profile.uid, otherUid).catch(() => undefined);
        } else {
          updateUnreadForChat(otherUid, (current) => current + 1);
        }
      }
    });
  }, [clearUnreadForChat, findKnownUser, getPreviewText, profile.uid, selectedContact, showChatOnMobile, updateUnreadForChat, upsertLocalChat]);

  useEffect(() => {
    if (selectedContact) {
      setMessagesLoading(true);
      setMessagesError(null);
      
      const unsubscribe = supabaseService.subscribeToMessages(
        profile.uid,
        selectedContact.uid,
        (msgs) => {
          const latestMessage = msgs[msgs.length - 1];
          setMessages((prev) => {
            const pendingOrFailed = prev.filter((m) => m.id.startsWith('temp-') || m.localStatus === 'failed');
            const serverMessages: LocalMessage[] = msgs.map((m) => ({ ...m, localStatus: 'sent' }));
            const merged = [...serverMessages, ...pendingOrFailed];
            const unique = new Map<string, LocalMessage>();
            merged.forEach((msg) => unique.set(msg.id, msg));
            return Array.from(unique.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
          if (latestMessage) {
            upsertLocalChat({
              otherUid: selectedContact.uid,
              user: selectedContact,
              lastMessage: getPreviewText(latestMessage),
              updatedAt: latestMessage.createdAt,
            });
          }
          setMessagesLoading(false);
        },
        (err) => {
          console.error("Messages subscription error:", err);
          setMessagesError("Failed to load messages. Please check your connection.");
          setMessagesLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError(null);
    }
  }, [getPreviewText, profile.uid, selectedContact, upsertLocalChat]);

  useEffect(() => {
    if (!selectedContact) return;
    clearUnreadForChat(selectedContact.uid);
    supabaseService.markMessagesAsRead(profile.uid, selectedContact.uid).catch(() => undefined);
  }, [clearUnreadForChat, profile.uid, selectedContact, messages.length]);

  useEffect(() => {
    if (!selectedContact || !showChatOnMobile && typeof window !== 'undefined' && window.innerWidth < 768) {
      supabaseService.setPresenceViewingChat(null);
      return;
    }

    supabaseService.setPresenceViewingChat(selectedContact.uid);
    return () => {
      supabaseService.setPresenceViewingChat(null);
    };
  }, [selectedContact, showChatOnMobile]);

  useEffect(() => {
    if (!selectedContact) {
      supabaseService.setPresenceTyping(null);
      return;
    }

    if (!newMessage.trim()) {
      supabaseService.setPresenceTyping(null);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    supabaseService.setPresenceTyping(selectedContact.uid);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      supabaseService.setPresenceTyping(null);
      typingTimeoutRef.current = null;
    }, 1200);

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [newMessage, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    adjustComposerHeight();
  }, [newMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    const files = [...selectedFiles];
    
    if ((!messageText && files.length === 0) || !selectedContact) return;
    if (editingMessageId) {
      try {
        await supabaseService.updateMessage(editingMessageId, profile.uid, messageText);
        setEditingMessageId(null);
        setNewMessage('');
      } catch (err) {
        console.error('Error editing message:', err);
        setError('Failed to update message');
      }
      return;
    }
    
    // If we're already uploading files, we can still send text-only messages,
    // but we shouldn't allow sending more files until the current ones finish.
    if (files.length > 0 && uploading) return;
    
    // Clear inputs immediately for smooth UX
    setNewMessage('');
    setSelectedFiles([]);
    supabaseService.setPresenceTyping(null);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: LocalMessage = {
      id: tempId,
      senderUid: profile.uid,
      receiverUid: selectedContact.uid,
      content: messageText,
      attachments: files.map((file) => ({
        name: file.name,
        url: '',
        type: file.type,
        size: file.size,
      })),
      createdAt: new Date().toISOString(),
      localStatus: 'pending',
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    upsertLocalChat({
      otherUid: selectedContact.uid,
      user: selectedContact,
      lastMessage: messageText || (files.length > 1 ? 'Attachments' : files.length > 0 ? 'Attachment' : ''),
      updatedAt: optimisticMessage.createdAt,
    });
    
    // Increment active uploads if there are files
    if (files.length > 0) {
      setActiveUploads(prev => prev + 1);
    }
    
    try {
      let attachments: Attachment[] = [];
      
      if (files.length > 0) {
        const uploadPromises = files.map(file => supabaseService.uploadFile(file));
        attachments = await Promise.all(uploadPromises);
      }

      const messageData: any = {
        senderUid: profile.uid,
        receiverUid: selectedContact.uid,
        content: messageText,
      };

      if (attachments.length > 0) {
        messageData.attachments = attachments;
      }

      const inserted = await supabaseService.sendMessage(messageData);
      upsertLocalChat({
        otherUid: selectedContact.uid,
        user: selectedContact,
        lastMessage: getPreviewText({ content: inserted.content, attachments }),
        updatedAt: inserted.createdAt,
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...inserted,
                localStatus: 'sent',
              }
            : msg
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError(files.length > 0 ? 'Failed to send message with attachments' : 'Failed to send message');
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, localStatus: 'failed' } : msg))
      );
      // Restore text if it failed
      if (messageText && !newMessage) {
        setNewMessage(messageText);
      }
    } finally {
      if (files.length > 0) {
        setActiveUploads(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      // Reset input value so the same file can be selected again
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openUserActions = (user: UserProfile) => {
    setChatActionsUser(user);
  };

  const cancelHold = () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const beginHold = (user: UserProfile) => {
    cancelHold();
    holdTimeoutRef.current = window.setTimeout(() => {
      openUserActions(user);
      holdTimeoutRef.current = null;
    }, 520);
  };

  const goToPayUser = (user: UserProfile) => {
    const params = new URLSearchParams({
      recipient: encodeURIComponent(user.publicId || user.uid),
      name: encodeURIComponent(user.displayName),
    });
    setChatActionsUser(null);
    navigate(`/wallets/transfer/details?${params.toString()}`);
  };

  const beginMessageHold = (message: LocalMessage) => {
    cancelHold();
    holdTimeoutRef.current = window.setTimeout(() => {
      setMessageActionsMessage(message);
      holdTimeoutRef.current = null;
    }, 520);
  };

  const handleEditMessage = (message: LocalMessage) => {
    if (message.senderUid !== profile.uid || message.isDeleted) return;
    setEditingMessageId(message.id);
    setNewMessage(message.content);
    setMessageActionsMessage(null);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleDeleteMessage = async (message: LocalMessage) => {
    if (message.senderUid !== profile.uid || message.isDeleted) return;
    try {
      await supabaseService.deleteMessage(message.id, profile.uid);
      if (editingMessageId === message.id) {
        setEditingMessageId(null);
        setNewMessage('');
      }
      setMessageActionsMessage(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  };

  const insertQuickMessage = (snippet: string) => {
    setNewMessage((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      return `${prev}${prev.endsWith(' ') ? '' : ' '}${snippet}`;
    });
    setShowKeyboardDock(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleClearCurrentChat = async () => {
    if (!selectedContact) return;
    try {
      await supabaseService.clearConversation(profile.uid, selectedContact.uid);
      closeChatView(true);
    } catch (err) {
      console.error('Error clearing chat:', err);
      setError('Failed to clear chat');
    }
  };

  const closeChatView = React.useCallback((replaceHistory: boolean = false) => {
    setChatActionsUser(null);
    setMessageActionsMessage(null);
    setShowAttachmentMenu(false);
    setShowChatOnMobile(false);
    setSelectedContact(null);
    setEditingMessageId(null);
    setSelectedFiles([]);
    setNewMessage('');
    setShowKeyboardDock(false);
    setSearchParams({}, { replace: true });
    navigate('/messages', { replace: replaceHistory });
  }, [navigate, setSearchParams]);

  const handleBackToChatList = React.useCallback(() => {
    closeChatView(true);
  }, [closeChatView]);

  const filteredActiveChats = activeChats.filter((chat) => {
    if (!chat?.user?.uid || !chat.user.displayName) return false;
    return (
      chat.user.displayName.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
      String(chat.lastMessage || '').toLowerCase().includes(sidebarSearchQuery.toLowerCase())
    );
  });

  const filteredNewChatUsers = allUsers.filter((user) =>
    user.displayName.toLowerCase().includes(newChatSearchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(newChatSearchQuery.toLowerCase())
  );

  const formatMessageDate = (date: Date) => {
    try {
      if (isToday(date)) return format(date, 'HH:mm');
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'dd/MM/yy');
    } catch (e) {
      return '';
    }
  };

  const MessageDateHeader = ({ date }: { date: Date }) => (
    <div className="flex justify-center my-4">
      <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-widest shadow-sm border border-gray-100">
        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy')}
      </div>
    </div>
  );

  const ChatSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const MessageSkeleton = () => (
    <div className="space-y-4 p-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
          <div className={`h-12 w-2/3 bg-gray-200 rounded-2xl ${i % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'}`}></div>
        </div>
      ))}
    </div>
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const mobileViewportHeight = typeof window !== 'undefined' ? Math.max(320, viewportHeight || window.innerHeight) : 320;
  const keyboardInset = typeof window !== 'undefined'
    ? Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop)
    : 0;
  const shouldLiftForKeyboard = isMobile && showChatOnMobile && isComposerFocused && keyboardInset > 0;
  const isSelectedContactOnline = selectedContact ? onlineUserIds.has(selectedContact.uid) : false;
  const selectedContactPresence = selectedContact ? presenceState[selectedContact.uid] : undefined;
  const isSelectedContactTyping = selectedContactPresence?.typingTo === profile.uid;

  useEffect(() => {
    if (!isComposerFocused) return;
    const timeout = window.setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [isComposerFocused, keyboardInset, viewportHeight]);

  const getOutgoingReceiptState = (message: LocalMessage): 'pending' | 'failed' | 'sent' | 'delivered' | 'read' => {
    if (message.localStatus === 'pending') return 'pending';
    if (message.localStatus === 'failed') return 'failed';
    if (message.readAt) return 'read';
    if (isSelectedContactOnline) return 'delivered';
    return 'sent';
  };

  const getSafeAttachments = (message: LocalMessage): Attachment[] =>
    Array.isArray(message.attachments)
      ? message.attachments.filter(
          (attachment): attachment is Attachment =>
            !!attachment &&
            typeof attachment.name === 'string' &&
            typeof attachment.type === 'string' &&
            typeof attachment.url === 'string' &&
            typeof attachment.size === 'number'
        )
      : [];

  useEffect(() => {
    if (!showAttachmentMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showAttachmentMenu]);

  useEffect(() => cancelHold, []);

  if (loading) return (
    <div className="h-full bg-white flex">
      <div className="w-full md:w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>
        <ChatSkeleton />
      </div>
      <div className="hidden md:flex flex-1 bg-gray-50 items-center justify-center">
        <div className="text-center animate-pulse">
          <MessageSquare size={48} className="text-gray-200 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 max-w-md">
        <p className="font-bold mb-1">Something went wrong</p>
        <p className="text-sm">{error}</p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-bold"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div 
      className={`h-[100dvh] md:h-screen min-h-0 bg-white flex relative overflow-hidden ${isMobile && showChatOnMobile ? 'z-[60]' : ''}`}
      style={isMobile && showChatOnMobile
        ? {
            minHeight: `${mobileViewportHeight}px`,
            height: `${mobileViewportHeight}px`,
          }
        : undefined}
    >
      {/* Contacts Sidebar */}
      <div className={`w-full md:w-[24rem] md:max-w-[24rem] border-r border-gray-200 flex flex-col bg-white transition-all duration-300 min-h-0 h-full ${showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Chats</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-600"
              >
                <PlusSquare size={20} />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-600"><MoreVertical size={20} /></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-base transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {filteredActiveChats.length > 0 ? (
            filteredActiveChats.map((chat) => (
              <button
                key={chat.otherUid}
                onClick={() => openChat(chat.user, chat)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openUserActions(chat.user);
                }}
                onTouchStart={() => beginHold(chat.user)}
                onTouchEnd={cancelHold}
                onTouchMove={cancelHold}
                onTouchCancel={cancelHold}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-all border-b border-gray-50 ${
                  selectedContact?.uid === chat.otherUid ? 'bg-teal-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <CachedImage
                    src={chat.user.photoURL}
                    alt={chat.user.displayName}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    wrapperClassName="w-14 h-14 rounded-2xl shadow-sm"
                    imgClassName="w-full h-full rounded-2xl object-cover"
                  />
                  {onlineUserIds.has(chat.user.uid) && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{chat.user.displayName}</p>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {chat.updatedAt ? formatMessageDate(ensureDate(chat.updatedAt)) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs truncate font-medium ${presenceState[chat.user.uid]?.typingTo === profile.uid ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {presenceState[chat.user.uid]?.typingTo === profile.uid ? 'Typing...' : chat.lastMessage || chat.user.role}
                    </p>
                    {unreadCounts[chat.otherUid] > 0 && (
                      <div className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {unreadCounts[chat.otherUid] > 9 ? '9+' : unreadCounts[chat.otherUid]}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-gray-300" size={32} />
              </div>
              <p className="text-gray-500 font-medium mb-2">No chats yet</p>
              <p className="text-xs text-gray-400 mb-6">Start a conversation with a student or freelancer</p>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="text-sm font-bold text-teal-700 hover:text-teal-800"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col bg-[#efeae2] transition-all duration-300 min-h-0 h-full overflow-hidden ${!showChatOnMobile ? 'hidden md:flex' : 'flex'}`}
      >
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="sticky top-0 flex-none px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-[#f0f2f5] z-20 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <button 
                  onClick={handleBackToChatList}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <CachedImage
                    src={selectedContact.photoURL}
                    alt={selectedContact.displayName}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    wrapperClassName="w-10 h-10 rounded-xl shadow-sm"
                    imgClassName="w-full h-full rounded-xl object-cover"
                  />
                  {isSelectedContactOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${selectedContact.uid}`)}>
                  <h3 className="truncate text-sm font-bold text-gray-900 leading-tight">{selectedContact.displayName}</h3>
                  <p className={`truncate text-[10px] font-bold uppercase tracking-wider ${isSelectedContactTyping || isSelectedContactOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {isSelectedContactTyping ? 'Typing...' : isSelectedContactOnline ? 'Online now' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openUserActions(selectedContact)} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages List - WhatsApp Style Background */}
            <div 
              className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-5 space-y-2 relative custom-scrollbar"
              style={{
                backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                backgroundBlendMode: 'overlay',
                backgroundColor: '#efeae2',
                paddingBottom: '18px',
              }}
            >
              {messagesLoading ? (
                <MessageSkeleton />
              ) : messagesError ? (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm text-center max-w-xs">
                    <p className="text-red-600 font-bold mb-2">Error</p>
                    <p className="text-sm text-gray-600 mb-4">{messagesError}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-teal-600 font-bold text-sm hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const isMe = msg.senderUid === profile.uid;
                  const msgDate = ensureDate(msg.createdAt);
                  const prevMsgDate = idx > 0 ? ensureDate(messages[idx-1].createdAt) : null;
                  const showDateHeader = !prevMsgDate || !isToday(msgDate) && format(msgDate, 'yyyy-MM-dd') !== format(prevMsgDate, 'yyyy-MM-dd');
                  const messageAttachments = getSafeAttachments(msg);
                  
                  return (
                    <React.Fragment key={msg.id || idx}>
                      {showDateHeader && <MessageDateHeader date={msgDate} />}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                        <div className={`relative max-w-[86%] md:max-w-[68%] px-3 py-2 rounded-2xl shadow-sm text-sm ${
                          isMe 
                            ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none' 
                            : 'bg-white text-gray-900 rounded-tl-none'
                        }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMessageActionsMessage(msg);
                          }}
                          onTouchStart={() => beginMessageHold(msg)}
                          onTouchEnd={cancelHold}
                          onTouchMove={cancelHold}
                          onTouchCancel={cancelHold}
                        >
                          {/* Bubble Tail */}
                          <div className={`absolute top-0 w-2 h-2 ${
                            isMe 
                              ? '-right-1 bg-[#dcf8c6] [clip-path:polygon(0_0,0_100%,100%_0)]' 
                              : '-left-1 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]'
                          }`}></div>
                          
                          {messageAttachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {messageAttachments.map((att, i) => {
                                const isImage = att.type.startsWith('image/');
                                return (
                                  <div key={i} className="rounded-lg overflow-hidden border border-black/5 bg-black/5">
                                    {isImage ? (
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                        <CachedImage
                                          src={att.url}
                                          alt={att.name}
                                          loading="lazy"
                                          decoding="async"
                                          referrerPolicy="no-referrer"
                                          wrapperClassName="max-w-full max-h-64"
                                          imgClassName="max-w-full max-h-64 object-contain"
                                        />
                                      </a>
                                    ) : (
                                      <a 
                                        href={att.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 hover:bg-black/10 transition-colors"
                                      >
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                          <FileIcon size={20} className="text-teal-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold truncate">{att.name}</p>
                                          <p className="text-[10px] text-gray-500">{(att.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Download size={16} className="text-gray-400" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {msg.content && <p className={`leading-relaxed pr-12 ${msg.isDeleted ? 'italic text-gray-500' : ''}`}>{msg.content}</p>}
                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            <span className="text-[9px] text-gray-500 font-medium">
                              {format(msgDate, 'HH:mm')}
                            </span>
                            {isMe && (() => {
                              const receiptState = getOutgoingReceiptState(msg);
                              if (receiptState === 'pending') {
                                return <Loader2 size={11} className="animate-spin text-gray-400" />;
                              }
                              if (receiptState === 'failed') {
                                return <X size={11} className="text-red-500" />;
                              }
                              if (receiptState === 'sent') {
                                return <Check size={12} className="text-gray-500 stroke-[3]" />;
                              }
                              const tickColor = receiptState === 'read' ? 'text-blue-500' : 'text-gray-500';
                              return (
                                <span className={`inline-flex items-center gap-0.5 ${tickColor}`}>
                                  <Check size={12} className="stroke-[3]" />
                                  <Check size={12} className="-ml-1.5 stroke-[3]" />
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm text-center max-w-xs">
                    <p className="text-xs text-gray-500 font-medium">Messages are end-to-end encrypted. No one outside of this chat, not even Connect, can read them.</p>
                  </div>
                </div>
              )}
              {isSelectedContactTyping && (
                <div className="flex justify-start mb-1">
                  <div className="relative max-w-[70%] px-3 py-2 rounded-xl rounded-tl-none shadow-sm text-sm bg-white text-gray-900">
                    <div className="-left-1 absolute top-0 w-2 h-2 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]"></div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - WhatsApp Style */}
            <div
              ref={composerRef}
              className="sticky bottom-0 flex-none border-t border-gray-200 bg-[#f0f2f5] px-3 py-2 transition-[padding,margin] duration-200 pb-[max(12px,env(safe-area-inset-bottom))]"
              style={{
                paddingBottom: shouldLiftForKeyboard ? `${Math.max(12, keyboardInset + 12)}px` : '12px',
                marginBottom: '0px',
              }}
            >
              {/* File Previews */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-white/50 rounded-xl">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="relative group">
                      <div className="w-20 h-20 rounded-lg bg-white border border-gray-200 flex flex-col items-center justify-center p-2 text-center overflow-hidden shadow-sm">
                        {file.type.startsWith('image/') ? (
                          <CachedImage
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            loading="lazy"
                            decoding="async"
                            wrapperClassName="w-full h-full rounded"
                            imgClassName="w-full h-full rounded object-cover"
                          />
                        ) : (
                          <>
                            <FileIcon size={24} className="text-teal-600 mb-1" />
                            <p className="text-[8px] font-bold truncate w-full">{file.name}</p>
                          </>
                        )}
                      </div>
                      <button 
                        onClick={() => removeFile(i)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md transition-opacity z-10"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex items-center gap-1">
                  <div className="relative" ref={attachmentMenuRef}>
                    <button 
                      type="button" 
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className={`p-2 rounded-full transition-all ${showAttachmentMenu ? 'text-teal-600 bg-teal-50' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      <PlusSquare size={24} />
                    </button>
                    
                    <AnimatePresence>
                      {showAttachmentMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-[180px] z-50"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.setAttribute('accept', 'image/*');
                              fileInputRef.current?.setAttribute('capture', 'environment');
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-700"
                          >
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                              <Video size={20} />
                            </div>
                            <span className="text-sm font-bold">Camera</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.removeAttribute('capture');
                              fileInputRef.current?.setAttribute('accept', 'image/*');
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-700"
                          >
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <ImageIcon size={20} />
                            </div>
                            <span className="text-sm font-bold">Photos & Videos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.removeAttribute('capture');
                              fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt,.zip');
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-700"
                          >
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                              <FileIcon size={20} />
                            </div>
                            <span className="text-sm font-bold">Documents</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1 relative rounded-[1.75rem] bg-white shadow-sm">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onFocus={() => {
                      setIsComposerFocused(true);
                      setShowKeyboardDock(true);
                      window.setTimeout(() => {
                        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      }, 160);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setIsComposerFocused(false), 120);
                    }}
                    placeholder={editingMessageId ? 'Edit your message' : 'Type a message'}
                    enterKeyHint="send"
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    spellCheck
                    className="w-full rounded-[1.75rem] border-transparent bg-transparent px-4 py-3 pr-12 text-[15px] transition-all focus:ring-0 resize-none overflow-y-auto max-h-40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeyboardDock((prev) => !prev);
                      window.setTimeout(() => inputRef.current?.focus(), 60);
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all ${showKeyboardDock ? 'bg-teal-50 text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Smile size={20} />
                  </button>
                </div>

                {(newMessage.trim().length > 0 || selectedFiles.length > 0) && (
                  <button
                    type="submit"
                    disabled={uploading}
                    className="p-3 rounded-full transition-all shadow-md flex items-center justify-center min-w-[48px] bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                )}
              </form>
              {(showKeyboardDock || isMobile) && (
                <div className="mt-2 rounded-2xl bg-white px-2 py-2 shadow-sm">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Quick Keyboard</p>
                    <button
                      type="button"
                      onClick={() => setShowKeyboardDock((prev) => !prev)}
                      className="text-[11px] font-bold text-teal-700"
                    >
                      {showKeyboardDock ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {quickKeyboardActions.map((snippet) => (
                      <button
                        key={snippet}
                        type="button"
                        onClick={() => insertQuickMessage(snippet)}
                        className="shrink-0 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                      >
                        {snippet}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => insertQuickMessage('😊')}
                      className="shrink-0 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                    >
                      Emoji
                    </button>
                  </div>
                </div>
              )}
              {editingMessageId && (
                <div className="mt-2 flex items-center justify-between rounded-2xl bg-white px-4 py-2 text-xs text-gray-600 shadow-sm">
                  <span>Editing message</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessageId(null);
                      setNewMessage('');
                    }}
                    className="font-bold text-red-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
            {/* Background Pattern for Empty State */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
              }}
            ></div>
            
            <div className="relative z-10">
              <div className="bg-white p-10 rounded-full shadow-2xl mb-8 mx-auto w-fit">
                <MessageSquare size={80} className="text-teal-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Connect Web</h3>
              <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                Connect with freelancers and clients in real-time. Send messages, share files, and build your professional network.
              </p>
              <div className="mt-12 flex items-center justify-center gap-2 text-gray-400">
                <Lock size={14} />
                <span className="text-xs font-medium">End-to-end encrypted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-teal-700 text-white">
                <h3 className="text-xl font-bold">New Chat</h3>
                <button onClick={() => setIsNewChatModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <ArrowLeft size={24} className="rotate-180" />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={newChatSearchQuery}
                    onChange={(e) => setNewChatSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-base transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {filteredNewChatUsers.length > 0 ? (
                  filteredNewChatUsers.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => {
                        setIsNewChatModalOpen(false);
                        openChat(user, {
                          otherUid: user.uid,
                          lastMessage: '',
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className="w-full p-3 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      <CachedImage
                        src={user.photoURL}
                        alt={user.displayName}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        wrapperClassName="w-12 h-12 rounded-xl shadow-sm"
                        imgClassName="w-full h-full rounded-xl object-cover"
                      />
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">{user.displayName}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No users found</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatActionsUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/40"
              onClick={() => setChatActionsUser(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl border-t border-gray-200 bg-white p-5"
            >
              <div className="mx-auto max-w-md space-y-4">
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900">{chatActionsUser.displayName}</p>
                  <p className="text-xs text-gray-500">Choose what you want to do with this contact.</p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      openChat(chatActionsUser, {
                        otherUid: chatActionsUser.uid,
                        lastMessage: '',
                        updatedAt: new Date().toISOString(),
                      });
                      setChatActionsUser(null);
                    }}
                    className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-200"
                  >
                    Open chat
                  </button>
                  <button
                    onClick={() => goToPayUser(chatActionsUser)}
                    className="w-full rounded-2xl bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-2"
                  >
                    <CircleDollarSign size={16} />
                    Pay user
                  </button>
                  {selectedContact?.uid === chatActionsUser.uid && (
                    <button
                      onClick={async () => {
                        setChatActionsUser(null);
                        await handleClearCurrentChat();
                      }}
                      className="w-full rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-100"
                    >
                      Clear chats
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigate(`/profile/${chatActionsUser.uid}`);
                      setChatActionsUser(null);
                    }}
                    className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-200"
                  >
                    View profile
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {messageActionsMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[72] bg-black/40"
              onClick={() => setMessageActionsMessage(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-[73] rounded-t-3xl border-t border-gray-200 bg-white p-5"
            >
              <div className="mx-auto max-w-md space-y-4">
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900">Message options</p>
                  <p className="text-xs text-gray-500">
                    {messageActionsMessage.isDeleted ? 'This message has already been deleted.' : 'Choose what you want to do with this message.'}
                  </p>
                </div>
                <div className="space-y-2">
                  {messageActionsMessage.senderUid === profile.uid && !messageActionsMessage.isDeleted ? (
                    <>
                      <button
                        onClick={() => handleEditMessage(messageActionsMessage)}
                        className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-200"
                      >
                        Edit message
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(messageActionsMessage)}
                        className="w-full rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-100"
                      >
                        Delete message
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600">
                      Only messages you sent can be edited or deleted.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
