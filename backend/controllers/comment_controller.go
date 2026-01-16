package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/frallan97/feedback-service/backend/database"
	"github.com/frallan97/feedback-service/backend/middleware"
	"github.com/frallan97/feedback-service/backend/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// GetComments returns all comments for a feedback item
func GetComments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	feedbackID := vars["id"]

	// Get user from context
	var userID uuid.UUID
	var isAdmin bool
	if claims, ok := middleware.GetUserClaims(r.Context()); ok {
		userID = claims.UserID
		isAdmin = claims.Role == "admin"
	}

	// Query comments - hide internal comments from non-admin users
	query := `
		SELECT id, feedback_id, user_id, content, is_internal, created_at, updated_at
		FROM feedback_comments
		WHERE feedback_id = $1
	`
	if !isAdmin {
		query += " AND is_internal = false"
	}
	query += " ORDER BY created_at ASC"

	rows, err := database.DB.QueryContext(r.Context(), query, feedbackID)
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch comments"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	comments := []models.FeedbackComment{}
	for rows.Next() {
		var c models.FeedbackComment
		if err := rows.Scan(&c.ID, &c.FeedbackID, &c.UserID, &c.Content, &c.IsInternal, &c.CreatedAt, &c.UpdatedAt); err != nil {
			continue
		}
		comments = append(comments, c)
	}

	json.NewEncoder(w).Encode(comments)
}

// CreateComment creates a new comment on a feedback item
func CreateComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	feedbackID := vars["id"]

	// Get user from context (must be authenticated)
	claims, ok := middleware.GetUserClaims(r.Context())
	if !ok {
		http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		Content    string `json:"content"`
		IsInternal bool   `json:"is_internal"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"Content is required"}`, http.StatusBadRequest)
		return
	}

	// Only admins can create internal comments
	if req.IsInternal && claims.Role != "admin" {
		http.Error(w, `{"error":"Only admins can create internal comments"}`, http.StatusForbidden)
		return
	}

	// Verify feedback exists
	var exists bool
	err := database.DB.QueryRowContext(r.Context(),
		"SELECT EXISTS(SELECT 1 FROM feedback WHERE id = $1)",
		feedbackID,
	).Scan(&exists)

	if err != nil || !exists {
		http.Error(w, `{"error":"Feedback not found"}`, http.StatusNotFound)
		return
	}

	// Insert comment
	var comment models.FeedbackComment
	err = database.DB.QueryRowContext(r.Context(), `
		INSERT INTO feedback_comments (feedback_id, user_id, content, is_internal)
		VALUES ($1, $2, $3, $4)
		RETURNING id, feedback_id, user_id, content, is_internal, created_at, updated_at
	`, feedbackID, claims.UserID, req.Content, req.IsInternal).Scan(
		&comment.ID, &comment.FeedbackID, &comment.UserID, &comment.Content, &comment.IsInternal, &comment.CreatedAt, &comment.UpdatedAt,
	)

	if err != nil {
		http.Error(w, `{"error":"Failed to create comment"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// UpdateComment updates a comment (only own comments or admin)
func UpdateComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	commentID := vars["comment_id"]

	// Get user from context
	claims, ok := middleware.GetUserClaims(r.Context())
	if !ok {
		http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"Content is required"}`, http.StatusBadRequest)
		return
	}

	// Check ownership or admin status
	var ownerID uuid.UUID
	err := database.DB.QueryRowContext(r.Context(),
		"SELECT user_id FROM feedback_comments WHERE id = $1",
		commentID,
	).Scan(&ownerID)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Comment not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch comment"}`, http.StatusInternalServerError)
		return
	}

	// Only owner or admin can update
	if ownerID != claims.UserID && claims.Role != "admin" {
		http.Error(w, `{"error":"You can only update your own comments"}`, http.StatusForbidden)
		return
	}

	// Update comment
	result, err := database.DB.ExecContext(r.Context(),
		"UPDATE feedback_comments SET content = $1 WHERE id = $2",
		req.Content, commentID,
	)
	if err != nil {
		http.Error(w, `{"error":"Failed to update comment"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Comment not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Comment updated successfully"})
}

// DeleteComment deletes a comment (only own comments or admin)
func DeleteComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	commentID := vars["comment_id"]

	// Get user from context
	claims, ok := middleware.GetUserClaims(r.Context())
	if !ok {
		http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
		return
	}

	// Check ownership or admin status
	var ownerID uuid.UUID
	err := database.DB.QueryRowContext(r.Context(),
		"SELECT user_id FROM feedback_comments WHERE id = $1",
		commentID,
	).Scan(&ownerID)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Comment not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"Failed to fetch comment"}`, http.StatusInternalServerError)
		return
	}

	// Only owner or admin can delete
	if ownerID != claims.UserID && claims.Role != "admin" {
		http.Error(w, `{"error":"You can only delete your own comments"}`, http.StatusForbidden)
		return
	}

	// Delete comment
	result, err := database.DB.ExecContext(r.Context(), "DELETE FROM feedback_comments WHERE id = $1", commentID)
	if err != nil {
		http.Error(w, `{"error":"Failed to delete comment"}`, http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, `{"error":"Comment not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Comment deleted successfully"})
}
