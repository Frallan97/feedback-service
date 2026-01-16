import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Settings, LogOut, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Feedback Service</span>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => navigate('/feedback')}>
                Feedback
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/applications')}>
                Applications
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground text-lg">
              Centralized feedback management dashboard
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>View Feedback</CardTitle>
                <CardDescription>Manage feedback from all applications</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/feedback')} className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Go to Feedback
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manage Apps</CardTitle>
                <CardDescription>Configure applications and API keys</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/applications')} className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Applications
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>View feedback statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Set up your feedback collection system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">1. Create an Application</h3>
                <p className="text-sm text-muted-foreground">
                  Register your app in the Applications page to get an API key.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">2. Integrate the Widget or SDK</h3>
                <p className="text-sm text-muted-foreground">
                  Add the feedback widget to your application or use the SDK for programmatic access.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">3. Collect & Manage Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  View, categorize, and respond to feedback from this dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
