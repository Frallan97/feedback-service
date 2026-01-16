import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const error = searchParams.get('error');

    // If this is opened in a popup (has window.opener), send message to parent
    if (window.opener) {
      if (accessToken) {
        window.opener.postMessage(
          {
            type: 'AUTH_SUCCESS',
            accessToken: accessToken,
          },
          window.location.origin
        );
      } else if (error) {
        window.opener.postMessage(
          {
            type: 'AUTH_ERROR',
            error: error,
          },
          window.location.origin
        );
      }

      // Close the popup
      window.close();
    } else {
      // If not in a popup, this is a direct navigation (e.g., user refreshed)
      // Redirect to login page
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
