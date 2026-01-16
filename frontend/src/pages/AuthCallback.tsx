import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    // Parse access token from URL query params
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    if (accessToken) {
      // Send token to parent window (main app)
      if (window.opener) {
        window.opener.postMessage(
          { type: 'AUTH_SUCCESS', accessToken },
          window.location.origin
        );
      }
    } else if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: 'AUTH_ERROR', error },
          window.location.origin
        );
      }
    }

    // Close popup after sending message
    setTimeout(() => {
      window.close();
    }, 500);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing login...</h2>
        <p className="text-gray-600">This window will close automatically.</p>
      </div>
    </div>
  );
}
