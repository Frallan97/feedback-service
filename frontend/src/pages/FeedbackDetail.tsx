import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { feedbackApi, type Feedback, type Comment } from '../lib/feedback-api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFeedbackDetail();
    }
  }, [id]);

  const loadFeedbackDetail = async () => {
    try {
      const [feedbackData, commentsData] = await Promise.all([
        feedbackApi.getFeedbackById(id!),
        feedbackApi.getComments(id!),
      ]);
      setFeedback(feedbackData);
      setComments(commentsData);
    } catch (error) {
      toast.error('Failed to load feedback details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await feedbackApi.createComment(id!, newComment, false);
      setNewComment('');
      toast.success('Comment added');
      loadFeedbackDetail();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await feedbackApi.updateFeedback(id!, { status });
      toast.success('Status updated');
      loadFeedbackDetail();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!feedback) return <div className="p-8">Feedback not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 max-w-4xl">
        <Button onClick={() => navigate('/feedback')} variant="ghost" className="mb-4">
          ← Back to Feedback List
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{feedback.title || 'Untitled Feedback'}</CardTitle>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                {feedback.status}
              </span>
              <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                {feedback.priority}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Content</h3>
              <p className="text-sm">{feedback.content}</p>
            </div>

            {feedback.rating && (
              <div>
                <h3 className="font-semibold mb-2">Rating</h3>
                <div className="flex">
                  {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                </div>
              </div>
            )}

            {feedback.contact_email && (
              <div>
                <h3 className="font-semibold mb-2">Contact</h3>
                <p className="text-sm">{feedback.contact_email}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Update Status</h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleUpdateStatus('new')}>New</Button>
                <Button size="sm" onClick={() => handleUpdateStatus('in_progress')}>In Progress</Button>
                <Button size="sm" onClick={() => handleUpdateStatus('resolved')}>Resolved</Button>
                <Button size="sm" onClick={() => handleUpdateStatus('closed')}>Closed</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-gray-200 pl-4 py-2">
                <p className="text-sm">{comment.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(comment.created_at).toLocaleString()}
                  {comment.is_internal && <span className="ml-2 text-red-600">(Internal)</span>}
                </p>
              </div>
            ))}

            <div className="pt-4 border-t">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handleAddComment}>Add Comment</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
