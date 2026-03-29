import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, PostComment, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';

interface CommentsProps {
  profile: UserProfile;
}

export default function Comments({ profile }: CommentsProps) {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    let active = true;
    Promise.all([supabaseService.getPostById(postId), supabaseService.listPostComments(postId)])
      .then(([postData, commentData]) => {
        if (!active) return;
        setPost(postData);
        setComments(commentData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = supabaseService.subscribeToPostComments(postId, setComments);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [postId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await supabaseService.addPostComment(postId, profile, newComment.trim());
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Comments</h1>
          <p className="text-xs text-gray-500">{comments.length} comment{comments.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading comments...</div>
      ) : (
        <>
          {post && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={post.authorPhoto} alt={post.authorName} className="w-9 h-9 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{post.authorName}</p>
                  <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="bg-white border border-gray-200 rounded-2xl p-3 flex items-end gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 min-h-[84px] px-3 py-2 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-3 py-2 rounded-xl bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Send size={14} />
              Post
            </button>
          </form>

          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="text-sm text-gray-500">No comments yet.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white border border-gray-200 rounded-2xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={comment.authorPhoto} alt={comment.authorName} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{comment.authorName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
