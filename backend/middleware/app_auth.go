package middleware

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/frallan97/feedback-service/backend/database"
	"github.com/google/uuid"
)

type appContextKey string

const AppIDKey appContextKey = "appID"

// AppAuth middleware validates API key and sets application ID in context
func AppAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to get API key from header first, then fall back to query param
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			apiKey = r.URL.Query().Get("api_key")
		}

		if apiKey == "" {
			http.Error(w, `{"error":"Missing API key"}`, http.StatusUnauthorized)
			return
		}

		// Validate API key and get application
		var appID uuid.UUID
		var isActive bool
		err := database.DB.QueryRowContext(r.Context(),
			"SELECT id, is_active FROM applications WHERE api_key = $1",
			apiKey,
		).Scan(&appID, &isActive)

		if err == sql.ErrNoRows {
			http.Error(w, `{"error":"Invalid API key"}`, http.StatusUnauthorized)
			return
		}
		if err != nil {
			http.Error(w, `{"error":"Internal server error"}`, http.StatusInternalServerError)
			return
		}

		if !isActive {
			http.Error(w, `{"error":"Application is inactive"}`, http.StatusForbidden)
			return
		}

		// Set application ID in context
		ctx := context.WithValue(r.Context(), AppIDKey, appID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetAppID retrieves the application ID from the request context
func GetAppID(ctx context.Context) (uuid.UUID, bool) {
	appID, ok := ctx.Value(AppIDKey).(uuid.UUID)
	return appID, ok
}
