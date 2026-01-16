package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/frallan97/feedback-service/backend/database"
	"github.com/frallan97/feedback-service/backend/middleware"
	"github.com/frallan97/feedback-service/backend/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// SubmitFeedback handles public feedback submission (API key authenticated)
func SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get application ID from context (set by AppAuth middleware)
	appID, ok := middleware.GetAppID(r.Context())
	if !ok {
		http.Error(w, `{"error":"Application ID not found"}`, http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req struct {
		CategoryID   *int                   `json:"category_id"`
		Title        string                 `json:"title"`
		Content      string                 `json:"content"`
		Rating       *int                   `json:"rating"`
		PageURL      string                 `json:"page_url"`
		BrowserInfo  map[string]interface{} `json:"browser_info"`
		AppVersion   string                 `json:"app_version"`
		Metadata     map[string]interface{} `json:"metadata"`
		ContactEmail string                 `json:"contact_email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Content == "" {
		http.Error(w, `{"error":"Content is required"}`, http.StatusBadRequest)
		return
	}

	if req.Rating != nil && (*req.Rating < 1 || *req.Rating > 5) {
		http.Error(w, `{"error":"Rating must be between 1 and 5"}`, http.StatusBadRequest)
		return
	}

	// Get user ID from JWT token if available (optional)
	var userID *uuid.UUID
	if userClaims, ok := r.Context().Value(middleware.UserClaimsKey).(*middleware.Claims); ok {
		userID = &userClaims.UserID
	}

	// Convert browser_info and metadata to JSON
	browserInfoJSON, _ := json.Marshal(req.BrowserInfo)
	metadataJSON, _ := json.Marshal(req.Metadata)

	// Insert feedback
	var feedbackID uuid.UUID
	err := database.DB.QueryRowContext(r.Context(), `
		INSERT INTO feedback (
			application_id, user_id, category_id, title, content, rating,
			status, priority, page_url, browser_info, app_version, metadata, contact_email
		) VALUES ($1, $2, $3, $4, $5, $6, 'new', 'medium', $7, $8, $9, $10, $11)
		RETURNING id
	`, appID, userID, req.CategoryID, req.Title, req.Content, req.Rating,
		req.PageURL, browserInfoJSON, req.AppVersion, metadataJSON, req.ContactEmail,
	).Scan(&feedbackID)

	if err != nil {
		http.Error(w, `{"error":"Failed to create feedback"}`, http.StatusInternalServerError)
		return
	}

	// Return feedback ID
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      feedbackID,
		"message": "Feedback submitted successfully",
	})
}

// GetFeedback returns paginated feedback with filters (admin endpoint)
func GetFeedback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse query parameters
	query := r.URL.Query()
	appID := query.Get("app_id")
	status := query.Get("status")
	priority := query.Get("priority")
	categoryID := query.Get("category_id")
	page, _ := strconv.Atoi(query.Get("page"))
	limit, _ := strconv.Atoi(query.Get("limit"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Build query
	queryStr := `
		SELECT id, application_id, user_id, category_id, title, content, rating,
			   status, priority, page_url, browser_info, app_version, metadata,
			   contact_email, created_at, updated_at, reviewed_at, resolved_at
		FROM feedback
		WHERE 1=1
	`
	args := []interface{}{}
	argPos := 1

	if appID != "" {
		queryStr += " AND application_id = $" + strconv.Itoa(argPos)
		args = append(args, appID)
		argPos++
	}
	if status != "" {
		queryStr += " AND status = $" + strconv.Itoa(argPos)
		args = append(args, status)
		argPos++
	}
	if priority != "" {
		queryStr += " AND priority = $" + strconv.Itoa(argPos)
		args = append(args, priority)
		argPos++
	}
	if categoryID != "" {
		queryStr += " AND category_id = $" + strconv.Itoa(argPos)
		args = append(args, categoryID)
		argPos++
	}

	queryStr += " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(argPos) + " OFFSET $" + strconv.Itoa(argPos+1)
	args = append(args, limit, offset)

	// Execute query
	rows, err := database.DB.QueryContext(r.Context(), queryStr, args...)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch feedback"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Parse results
	feedbacks := []models.Feedback{}
	for rows.Next() {
		var f models.Feedback
		var browserInfoJSON, metadataJSON []byte

		err := rows.Scan(
			&f.ID, &f.ApplicationID, &f.UserID, &f.CategoryID, &f.Title, &f.Content, &f.Rating,
			&f.Status, &f.Priority, &f.PageURL, &browserInfoJSON, &f.AppVersion, &metadataJSON,
			&f.ContactEmail, &f.CreatedAt, &f.UpdatedAt, &f.ReviewedAt, &f.ResolvedAt,
		)
		if err != nil {
			continue
		}

		// Parse JSON fields
		if browserInfoJSON != nil {
			json.Unmarshal(browserInfoJSON, &f.BrowserInfo)
		}
		if metadataJSON != nil {
			json.Unmarshal(metadataJSON, &f.Metadata)
		}

		feedbacks = append(feedbacks, f)
	}

	// Get total count
	var total int
	countQuery := "SELECT COUNT(*) FROM feedback WHERE 1=1"
	countArgs := []interface{}{}
	argPos = 1
	if appID != "" {
		countQuery += " AND application_id = $" + strconv.Itoa(argPos)
		countArgs = append(countArgs, appID)
		argPos++
	}
	if status != "" {
		countQuery += " AND status = $" + strconv.Itoa(argPos)
		countArgs = append(countArgs, status)
		argPos++
	}
	if priority != "" {
		countQuery += " AND priority = $" + strconv.Itoa(argPos)
		countArgs = append(countArgs, priority)
		argPos++
	}
	if categoryID != "" {
		countQuery += " AND category_id = $" + strconv.Itoa(argPos)
		countArgs = append(countArgs, categoryID)
		argPos++
	}
	database.DB.QueryRowContext(r.Context(), countQuery, countArgs...).Scan(&total)

	// Return response
	json.NewEncoder(w).Encode(map[string]interface{}{
		"feedback": feedbacks,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// GetFeedbackByID returns a single feedback item (admin endpoint)
func GetFeedbackByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	feedbackID := vars["id"]

	var f models.Feedback
	var browserInfoJSON, metadataJSON []byte

	err := database.DB.QueryRowContext(r.Context(), `
		SELECT id, application_id, user_id, category_id, title, content, rating,
			   status, priority, page_url, browser_info, app_version, metadata,
			   contact_email, created_at, updated_at, reviewed_at, resolved_at
		FROM feedback
		WHERE id = $1
	`, feedbackID).Scan(
		&f.ID, &f.ApplicationID, &f.UserID, &f.CategoryID, &f.Title, &f.Content, &f.Rating,
		&f.Status, &f.Priority, &f.PageURL, &browserInfoJSON, &f.AppVersion, &metadataJSON,
		&f.ContactEmail, &f.CreatedAt, &f.UpdatedAt, &f.ReviewedAt, &f.ResolvedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Feedback not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch feedback"}`, http.StatusInternalServerError)
		return
	}

	// Parse JSON fields
	if browserInfoJSON != nil {
		json.Unmarshal(browserInfoJSON, &f.BrowserInfo)
	}
	if metadataJSON != nil {
		json.Unmarshal(metadataJSON, &f.Metadata)
	}

	json.NewEncoder(w).Encode(f)
}

// UpdateFeedback updates feedback status, priority, or other fields (admin endpoint)
func UpdateFeedback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	feedbackID := vars["id"]

	// Parse request body
	var req struct {
		Status     *string `json:"status"`
		Priority   *string `json:"priority"`
		CategoryID *int    `json:"category_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Status != nil {
		updates = append(updates, "status = $"+strconv.Itoa(argPos))
		args = append(args, *req.Status)
		argPos++

		// Set reviewed_at or resolved_at based on status
		if *req.Status == "in_progress" || *req.Status == "under_review" {
			updates = append(updates, "reviewed_at = $"+strconv.Itoa(argPos))
			args = append(args, time.Now())
			argPos++
		} else if *req.Status == "resolved" || *req.Status == "closed" {
			updates = append(updates, "resolved_at = $"+strconv.Itoa(argPos))
			args = append(args, time.Now())
			argPos++
		}
	}

	if req.Priority != nil {
		updates = append(updates, "priority = $"+strconv.Itoa(argPos))
		args = append(args, *req.Priority)
		argPos++
	}

	if req.CategoryID != nil {
		updates = append(updates, "category_id = $"+strconv.Itoa(argPos))
		args = append(args, *req.CategoryID)
		argPos++
	}

	if len(updates) == 0 {
		http.Error(w, `{"error":"No fields to update"}`, http.StatusBadRequest)
		return
	}

	// Add feedback ID to args
	args = append(args, feedbackID)

	// Execute update
	query := "UPDATE feedback SET " + updates[0]
	for i := 1; i < len(updates); i++ {
		query += ", " + updates[i]
	}
	query += " WHERE id = $" + strconv.Itoa(argPos)

	result, err := database.DB.ExecContext(r.Context(), query, args...)
	if err != nil {
		http.Error(w, `{"error":"Failed to update feedback"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Feedback not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Feedback updated successfully"})
}

// DeleteFeedback deletes a feedback item (admin endpoint)
func DeleteFeedback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	feedbackID := vars["id"]

	result, err := database.DB.ExecContext(r.Context(), "DELETE FROM feedback WHERE id = $1", feedbackID)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete feedback"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Feedback not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Feedback deleted successfully"})
}

// GetPublicFeedbackStatus allows checking feedback status with API key (public endpoint)
func GetPublicFeedbackStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get application ID from context (set by AppAuth middleware)
	appID, ok := middleware.GetAppID(r.Context())
	if !ok {
		http.Error(w, `{"error":"Application ID not found"}`, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	feedbackID := vars["id"]

	// Only return status and basic info, not full details
	var status, priority string
	var createdAt time.Time

	err := database.DB.QueryRowContext(r.Context(), `
		SELECT status, priority, created_at
		FROM feedback
		WHERE id = $1 AND application_id = $2
	`, feedbackID, appID).Scan(&status, &priority, &createdAt)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Feedback not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch feedback"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         feedbackID,
		"status":     status,
		"priority":   priority,
		"created_at": createdAt,
	})
}

// GetPublicCategories returns categories for an application (public endpoint)
func GetPublicCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get application ID from context (set by AppAuth middleware)
	appID, ok := middleware.GetAppID(r.Context())
	if !ok {
		http.Error(w, `{"error":"Application ID not found"}`, http.StatusUnauthorized)
		return
	}

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
