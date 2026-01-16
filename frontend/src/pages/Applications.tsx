import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationApi, type Application } from '../lib/feedback-api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function Applications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await applicationApi.getApplications();
      setApplications(data);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newApp = await applicationApi.createApplication(formData);
      toast.success('Application created successfully!');
      setFormData({ name: '', slug: '', description: '' });
      setShowCreate(false);
      setSelectedApp(newApp); // Show the new app with API key
      loadApplications();
    } catch (error) {
      toast.error('Failed to create application');
    }
  };

  const handleViewApiKey = async (id: string) => {
    try {
      const app = await applicationApi.getApplicationById(id);
      setSelectedApp(app);
    } catch (error) {
      toast.error('Failed to load API key');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('Are you sure? This will invalidate the current API key.')) return;
    try {
      const result = await applicationApi.regenerateApiKey(id);
      toast.success('API key regenerated');
      if (selectedApp?.id === id) {
        setSelectedApp({ ...selectedApp, api_key: result.api_key });
      }
    } catch (error) {
      toast.error('Failed to regenerate API key');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Applications</h1>
          <div className="space-x-2">
            <Button onClick={() => navigate('/feedback')}>Feedback</Button>
            <Button onClick={() => navigate('/')}>Dashboard</Button>
            <Button onClick={() => setShowCreate(true)}>+ Create Application</Button>
          </div>
        </div>

        {showCreate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Application</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    placeholder="my-app"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Create</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {selectedApp && (
          <Card className="mb-6 border-blue-500">
            <CardHeader>
              <CardTitle>API Key for {selectedApp.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Key (keep this secret!)</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={selectedApp.api_key} readOnly className="font-mono" />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedApp.api_key!);
                      toast.success('API key copied!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRegenerateKey(selectedApp.id)}
                >
                  Regenerate Key
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{app.name}</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      app.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {app.is_active ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{app.description}</p>
                <div className="text-xs text-muted-foreground">
                  <div>Slug: {app.slug}</div>
                  <div>Created: {new Date(app.created_at).toLocaleDateString()}</div>
                </div>
                <Button size="sm" onClick={() => handleViewApiKey(app.id)}>
                  View API Key
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {applications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No applications found. Create your first application to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
