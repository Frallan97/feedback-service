package handlers

import (
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/frallan97/feedback-service/backend/config"
	"github.com/frallan97/feedback-service/backend/controllers"
	"github.com/frallan97/feedback-service/backend/middleware"
	"github.com/gorilla/mux"
)

// SetupRouter configures all routes
// IMPORTANT: All routes include OPTIONS method for CORS preflight requests
func SetupRouter(cfg *config.Config, enforcer *casbin.Enforcer) http.Handler {
	r := mux.NewRouter()

	// Global middleware - CORS must be first!
	r.Use(middleware.CORS)
	r.Use(middleware.Logger)
	r.Use(middleware.Recovery)

	// API v1 routes
	api := r.PathPrefix("/api/v1").Subrouter()

	// Public health check
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET", "OPTIONS")

	// Public API (API key authentication) - for client applications
	public := api.PathPrefix("/public").Subrouter()
	public.Use(middleware.AppAuth)
	public.HandleFunc("/feedback", controllers.SubmitFeedback).Methods("POST", "OPTIONS")
	public.HandleFunc("/feedback/{id}", controllers.GetPublicFeedbackStatus).Methods("GET", "OPTIONS")
	public.HandleFunc("/categories", controllers.GetPublicCategories).Methods("GET", "OPTIONS")

	// Auth endpoints (public except /me)
	api.HandleFunc("/auth/refresh", controllers.RefreshToken).Methods("POST", "OPTIONS")
	api.HandleFunc("/auth/logout", controllers.Logout).Methods("POST", "OPTIONS")

	// Protected routes requiring JWT authentication
	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.Auth(cfg.JWTPublicKey))

	// Auth /me endpoint (authenticated)
	protected.HandleFunc("/auth/me", controllers.GetCurrentUser).Methods("GET", "OPTIONS")

	// Protected + Authorized routes (role-based access control)
	authorized := protected.PathPrefix("").Subrouter()
	authorized.Use(middleware.Authorize(enforcer))

	// Feedback management (admin)
	authorized.HandleFunc("/feedback", controllers.GetFeedback).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/feedback/{id}", controllers.GetFeedbackByID).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/feedback/{id}", controllers.UpdateFeedback).Methods("PATCH", "OPTIONS")
	authorized.HandleFunc("/feedback/{id}", controllers.DeleteFeedback).Methods("DELETE", "OPTIONS")

	// Comments (authenticated users can view/create, admins can manage)
	authorized.HandleFunc("/feedback/{id}/comments", controllers.GetComments).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/feedback/{id}/comments", controllers.CreateComment).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/feedback/{id}/comments/{comment_id}", controllers.UpdateComment).Methods("PATCH", "OPTIONS")
	authorized.HandleFunc("/feedback/{id}/comments/{comment_id}", controllers.DeleteComment).Methods("DELETE", "OPTIONS")

	// Application management (admin only)
	authorized.HandleFunc("/applications", controllers.GetApplications).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/applications", controllers.CreateApplication).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/applications/{id}", controllers.GetApplicationByID).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/applications/{id}", controllers.UpdateApplication).Methods("PATCH", "OPTIONS")
	authorized.HandleFunc("/applications/{id}", controllers.DeleteApplication).Methods("DELETE", "OPTIONS")
	authorized.HandleFunc("/applications/{id}/regenerate-key", controllers.RegenerateAPIKey).Methods("POST", "OPTIONS")

	// Categories (admin only)
	authorized.HandleFunc("/applications/{app_id}/categories", controllers.GetCategories).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/applications/{app_id}/categories", controllers.CreateCategory).Methods("POST", "OPTIONS")

	return r
}
