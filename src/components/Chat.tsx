import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserProfile, Message, Attachment } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Send, Search, MessageSquare, User, MoreVertical, Phone, Video, ArrowLeft, CheckCheck, Smile, PlusSquare, Lock, FileIcon, X, Download, Image as ImageIcon, Loader2, Clock3, Check } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  profile: UserProfile;
}

type LocalMessage = Message & { localStatus?: 'pending' | 'sent' | 'failed' };

export default function Chat({ profile }: ChatProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUid = searchParams.get('uid');
  
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const uploading = activeUploads > 0;
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);

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

  // Lock body scroll when chat is open on mobile
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile && showChatOnMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showChatOnMobile]);

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
        if (chats.length === 0) {
          try {
            const recent = await supabaseService.getRecentConversations(profile.uid);
            setActiveChats(recent);
          } catch (e) {
            setActiveChats([]);
          }
        } else {
          setActiveChats(chats);
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
  }, [profile.uid]);

  // Handle targetUid from search params separately to ensure it updates correctly
  useEffect(() => {
    if (!targetUid) {
      isInitialLoad.current = false;
      return;
    }

    const loadTargetUser = async () => {
      // If we already have the selected contact and it matches targetUid, don't do anything
      if (selectedContact?.uid === targetUid) return;

      // Check if user is already in active chats to avoid extra fetch
      const activeChat = activeChats.find(c => c.otherUid === targetUid);
      if (activeChat) {
        setSelectedContact(activeChat.user);
        setShowChatOnMobile(true);
      } else if (isInitialLoad.current || !selectedContact) {
        // Fetch user if not in active chats or if it's the initial load
        try {
          const user = await supabaseService.getUserProfile(targetUid);
          if (user) {
            setSelectedContact(user);
            setShowChatOnMobile(true);
          }
        } catch (err) {
          console.error('Error loading target user:', err);
          setError('Failed to load user profile');
        }
      }
      isInitialLoad.current = false;
    };

    loadTargetUser();
  }, [targetUid, activeChats, selectedContact]);

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
    if (selectedContact) {
      setMessagesLoading(true);
      setMessagesError(null);
      
      const unsubscribe = supabaseService.subscribeToMessages(
        profile.uid,
        selectedContact.uid,
        (msgs) => {
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
  }, [profile.uid, selectedContact]);

  useEffect(() => {
    if (!selectedContact) return;
    supabaseService.markChatAsRead(profile.uid, selectedContact.uid);
  }, [profile.uid, selectedContact, messages.length]);

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
    
    if (!messageText || !selectedContact) return;
    
    // If we're already uploading files, we can still send text-only messages,
    // but we shouldn't allow sending more files until the current ones finish.
    if (files.length > 0 && uploading) return;
    
    // Clear inputs immediately for smooth UX
    setNewMessage('');
    setSelectedFiles([]);

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

  const filteredActiveChats = activeChats.filter(chat => 
    chat.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNewChatUsers = allUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div 
      className={`h-full bg-white flex relative overflow-hidden ${isMobile && showChatOnMobile ? 'fixed inset-0 z-[60]' : ''}`}
      style={isMobile && showChatOnMobile ? { 
        height: `${viewportHeight}px`,
        top: `${viewportOffsetTop}px`
      } : {}}
    >
      {/* Contacts Sidebar */}
      <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col bg-white transition-all duration-300 ${showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl text-base transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredActiveChats.length > 0 ? (
            filteredActiveChats.map(chat => (
              <button
                key={chat.otherUid}
                onClick={() => {
                  setSelectedContact(chat.user);
                  setShowChatOnMobile(true);
                  setSearchParams({ uid: chat.otherUid });
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-all border-b border-gray-50 ${
                  selectedContact?.uid === chat.otherUid ? 'bg-teal-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <img src={chat.user.photoURL} alt={chat.user.displayName} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{chat.user.displayName}</p>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {chat.updatedAt ? formatMessageDate(ensureDate(chat.updatedAt)) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 truncate font-medium">{chat.lastMessage || chat.user.role}</p>
                    {/* Placeholder for unread count */}
                    {/* <div className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">2</div> */}
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
      <div className={`flex-1 flex flex-col bg-[#efeae2] transition-all duration-300 overflow-hidden ${!showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="flex-none px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white/95 backdrop-blur-md z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setShowChatOnMobile(false);
                    setSearchParams({});
                  }}
                  className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <img src={selectedContact.photoURL} alt={selectedContact.displayName} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="cursor-pointer" onClick={() => navigate(`/profile/${selectedContact.uid}`)}>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">{selectedContact.displayName}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all"><Phone size={20} /></button>
                <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all"><Video size={20} /></button>
                <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages List - WhatsApp Style Background */}
            <div 
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 relative custom-scrollbar"
              style={{
                backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                backgroundBlendMode: 'overlay',
                backgroundColor: '#efeae2'
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
                  
                  return (
                    <React.Fragment key={msg.id || idx}>
                      {showDateHeader && <MessageDateHeader date={msgDate} />}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                        <div className={`relative max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-xl shadow-sm text-sm ${
                          isMe 
                            ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none' 
                            : 'bg-white text-gray-900 rounded-tl-none'
                        }`}>
                          {/* Bubble Tail */}
                          <div className={`absolute top-0 w-2 h-2 ${
                            isMe 
                              ? '-right-1 bg-[#dcf8c6] [clip-path:polygon(0_0,0_100%,100%_0)]' 
                              : '-left-1 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]'
                          }`}></div>
                          
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {msg.attachments.map((att, i) => {
                                const isImage = att.type.startsWith('image/');
                                return (
                                  <div key={i} className="rounded-lg overflow-hidden border border-black/5 bg-black/5">
                                    {isImage ? (
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img 
                                          src={att.url} 
                                          alt={att.name} 
                                          className="max-w-full max-h-64 object-contain"
                                          referrerPolicy="no-referrer"
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

                          {msg.content && <p className="leading-relaxed pr-12">{msg.content}</p>}
                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            <span className="text-[9px] text-gray-500 font-medium">
                              {format(msgDate, 'HH:mm')}
                            </span>
                            {isMe && (
                              <>
                                {msg.localStatus === 'pending' && <Clock3 size={11} className="text-gray-400" />}
                                {msg.localStatus === 'failed' && <X size={11} className="text-red-500" />}
                                {(!msg.localStatus || msg.localStatus === 'sent') && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Check size={11} className="text-blue-500" />
                                    <Check size={11} className="-ml-1 text-blue-500" />
                                  </span>
                                )}
                              </>
                            )}
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
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - WhatsApp Style */}
            <div className="flex-none p-3 bg-[#f0f2f5] border-t border-gray-200">
              {/* File Previews */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-white/50 rounded-xl">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="relative group">
                      <div className="w-20 h-20 rounded-lg bg-white border border-gray-200 flex flex-col items-center justify-center p-2 text-center overflow-hidden shadow-sm">
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="preview" 
                            className="w-full h-full object-cover rounded" 
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

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="relative">
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
                
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message"
                    className="w-full px-4 py-2.5 bg-white border-transparent focus:ring-0 rounded-xl text-base transition-all shadow-sm resize-none overflow-y-auto max-h-40"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600">
                    <Smile size={20} />
                  </button>
                </div>

                {newMessage.trim().length > 0 && (
                  <button
                    type="submit"
                    disabled={uploading}
                    className="p-3 rounded-full transition-all shadow-md flex items-center justify-center min-w-[48px] bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                )}
              </form>
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                        setSelectedContact(user);
                        setShowChatOnMobile(true);
                        setIsNewChatModalOpen(false);
                        setSearchParams({ uid: user.uid });
                      }}
                      className="w-full p-3 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
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
