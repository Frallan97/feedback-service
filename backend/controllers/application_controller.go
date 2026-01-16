package controllers

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"

	"github.com/frallan97/feedback-service/backend/database"
	"github.com/frallan97/feedback-service/backend/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/lib/pq"
)

// generateAPIKey creates a random API key
func generateAPIKey() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// CreateApplication creates a new application and generates an API key (admin only)
func CreateApplication(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Name           string   `json:"name"`
		Slug           string   `json:"slug"`
		Description    string   `json:"description"`
		WebhookURL     *string  `json:"webhook_url"`
		AllowedOrigins []string `json:"allowed_origins"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" || req.Slug == "" {
		http.Error(w, `{"error":"Name and slug are required"}`, http.StatusBadRequest)
		return
	}

	// Generate API key
	apiKey, err := generateAPIKey()
	if err != nil {
		http.Error(w, `{"error":"Failed to generate API key"}`, http.StatusInternalServerError)
		return
	}

	// Insert application
	var app models.Application
	err = database.DB.QueryRowContext(r.Context(), `
		INSERT INTO applications (name, slug, description, api_key, webhook_url, allowed_origins)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, slug, description, api_key, is_active, webhook_url, allowed_origins, created_at, updated_at
	`, req.Name, req.Slug, req.Description, apiKey, req.WebhookURL, pq.Array(req.AllowedOrigins)).Scan(
		&app.ID, &app.Name, &app.Slug, &app.Description, &app.APIKey, &app.IsActive,
		&app.WebhookURL, pq.Array(&app.AllowedOrigins), &app.CreatedAt, &app.UpdatedAt,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, `{"error":"Application with this slug already exists"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error":"Failed to create application"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(app)
}

// GetApplications returns all applications (admin only)
func GetApplications(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := database.DB.QueryContext(r.Context(), `
		SELECT id, name, slug, description, is_active, webhook_url, allowed_origins, created_at, updated_at
		FROM applications
		ORDER BY name
	`)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch applications"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	applications := []models.Application{}
	for rows.Next() {
		var app models.Application
		err := rows.Scan(
			&app.ID, &app.Name, &app.Slug, &app.Description, &app.IsActive,
			&app.WebhookURL, pq.Array(&app.AllowedOrigins), &app.CreatedAt, &app.UpdatedAt,
		)
		if err != nil {
			continue
		}
		// Don't expose API key in list view
		app.APIKey = ""
		applications = append(applications, app)
	}

	json.NewEncoder(w).Encode(applications)
}

// GetApplicationByID returns a single application with API key (admin only)
func GetApplicationByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	appID := vars["id"]

	var app models.Application
	err := database.DB.QueryRowContext(r.Context(), `
		SELECT id, name, slug, description, api_key, is_active, webhook_url, allowed_origins, created_at, updated_at
		FROM applications
		WHERE id = $1
	`, appID).Scan(
		&app.ID, &app.Name, &app.Slug, &app.Description, &app.APIKey, &app.IsActive,
		&app.WebhookURL, pq.Array(&app.AllowedOrigins), &app.CreatedAt, &app.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Application not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch application"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(app)
}

// UpdateApplication updates an application (admin only)
func UpdateApplication(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	appID := vars["id"]

	var req struct {
		Name           *string  `json:"name"`
		Description    *string  `json:"description"`
		IsActive       *bool    `json:"is_active"`
		WebhookURL     *string  `json:"webhook_url"`
		AllowedOrigins []string `json:"allowed_origins"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		updates = append(updates, "name = $"+string(rune(argPos+'0')))
		args = append(args, *req.Name)
		argPos++
	}

	if req.Description != nil {
		updates = append(updates, "description = $"+string(rune(argPos+'0')))
		args = append(args, *req.Description)
		argPos++
	}

	if req.IsActive != nil {
		updates = append(updates, "is_active = $"+string(rune(argPos+'0')))
		args = append(args, *req.IsActive)
		argPos++
	}

	if req.WebhookURL != nil {
		updates = append(updates, "webhook_url = $"+string(rune(argPos+'0')))
		args = append(args, *req.WebhookURL)
		argPos++
	}

	if req.AllowedOrigins != nil {
		updates = append(updates, "allowed_origins = $"+string(rune(argPos+'0')))
		args = append(args, pq.Array(req.AllowedOrigins))
		argPos++
	}

	if len(updates) == 0 {
		http.Error(w, `{"error":"No fields to update"}`, http.StatusBadRequest)
		return
	}

	// Add app ID to args
	args = append(args, appID)

	// Execute update
	query := "UPDATE applications SET " + updates[0]
	for i := 1; i < len(updates); i++ {
		query += ", " + updates[i]
	}
	query += " WHERE id = $" + string(rune(argPos+'0'))

	result, err := database.DB.ExecContext(r.Context(), query, args...)
	if err != nil {
		http.Error(w, `{"error":"Failed to update application"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Application not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Application updated successfully"})
}

// RegenerateAPIKey generates a new API key for an application (admin only)
func RegenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	appID := vars["id"]

	// Generate new API key
	apiKey, err := generateAPIKey()
	if err != nil {
		http.Error(w, `{"error":"Failed to generate API key"}`, http.StatusInternalServerError)
		return
	}

	// Update API key
	result, err := database.DB.ExecContext(r.Context(),
		"UPDATE applications SET api_key = $1 WHERE id = $2",
		apiKey, appID,
	)
	if err != nil {
		http.Error(w, `{"error":"Failed to update API key"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Application not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"api_key": apiKey,
		"message": "API key regenerated successfully",
	})
}

// DeleteApplication deletes an application and all its feedback (admin only)
func DeleteApplication(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	appID := vars["id"]

	result, err := database.DB.ExecContext(r.Context(), "DELETE FROM applications WHERE id = $1", appID)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete application"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Application not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Application deleted successfully"})
}

// GetCategories returns all categories for an application (admin only)
func GetCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	appID := vars["app_id"]

	rows, err := database.DB.QueryContext(r.Context(), `
		SELECT id, application_id, name, color, icon, created_at
		FROM categories
		WHERE application_id = $1
		ORDER BY name
	`, appID)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch categories"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.ApplicationID, &c.Name, &c.Color, &c.Icon, &c.CreatedAt); err != nil {
			continue
		}
		categories = append(categories, c)
	}

	json.NewEncoder(w).Encode(categories)
}

// CreateCategory creates a new category for an application (admin only)
func CreateCategory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	appIDStr := vars["app_id"]
	appID, err := uuid.Parse(appIDStr)
	if err != nil {
		http.Error(w, `{"error":"Invalid application ID"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
		Icon  string `json:"icon"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, `{"error":"Name is required"}`, http.StatusBadRequest)
		return
	}

	// Set defaults
	if req.Color == "" {
		req.Color = "#3b82f6"
	}

	var category models.Category
	err = database.DB.QueryRowContext(r.Context(), `
		INSERT INTO categories (application_id, name, color, icon)
		VALUES ($1, $2, $3, $4)
		RETURNING id, application_id, name, color, icon, created_at
	`, appID, req.Name, req.Color, req.Icon).Scan(
		&category.ID, &category.ApplicationID, &category.Name, &category.Color, &category.Icon, &category.CreatedAt,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, `{"error":"Category with this name already exists for this application"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error":"Failed to create category"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(category)
}
