package middleware

import (
	"net/http"

	"github.com/casbin/casbin/v2"
)

// Authorize is a middleware that checks authorization using Casbin
func Authorize(enforcer *casbin.Enforcer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get user ID from context (set by Auth middleware)
			_, ok := GetUserID(r.Context())
			if !ok {
				http.Error(w, "User not authenticated", http.StatusUnauthorized)
				return
			}

			// Check authorization with Casbin
			// Subject: "user" role (all authenticated users)
			// Object: request path
			// Action: HTTP method
			allowed, err := enforcer.Enforce("user", r.URL.Path, r.Method)
			if err != nil {
				http.Error(w, "Authorization error", http.StatusInternalServerError)
				return
			}

			if !allowed {
				http.Error(w, "Forbidden: insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
