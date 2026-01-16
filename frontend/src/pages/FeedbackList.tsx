import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackApi, type Feedback } from '../lib/feedback-api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function FeedbackList() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const data = await feedbackApi.getFeedback({ limit: 50 });
      setFeedback(data.feedback);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading feedback...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <div className="space-x-2">
            <Button onClick={() => navigate('/applications')}>Applications</Button>
            <Button onClick={() => navigate('/')}>Dashboard</Button>
          </div>
        </div>

        <div className="grid gap-4">
          {feedback.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/feedback/${item.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{item.title || 'Untitled Feedback'}</span>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      {item.status}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                      {item.priority}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.contact_email && <span>{item.contact_email}</span>}
                </div>
              </CardContent>
            </Card>
          ))}

          {feedback.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No feedback found. Feedback will appear here when submitted via the widget or SDK.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
