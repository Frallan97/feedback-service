package services

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/frallan97/feedback-service/backend/database"
	"github.com/frallan97/feedback-service/backend/models"
	"github.com/google/uuid"
)

// CreateOrUpdateUser syncs user from JWT claims to local database
// This is called after JWT validation to ensure user exists locally
func CreateOrUpdateUser(ctx context.Context, userID uuid.UUID, email, name string) (*models.User, error) {
	query := `
        INSERT INTO users (id, email, name, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            name = EXCLUDED.name,
            updated_at = NOW()
        RETURNING id, email, name, google_id, avatar_url, is_active, is_admin, created_at, updated_at
    `

	var user models.User
	err := database.DB.QueryRowContext(ctx, query, userID, email, name).Scan(
		&user.ID, &user.Email, &user.Name, &user.GoogleID, &user.AvatarURL,
		&user.IsActive, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create/update user: %w", err)
	}

	return &user, nil
}

// GetUserByID fetches a user by ID
func GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	query := `
        SELECT id, email, name, google_id, avatar_url, is_active, is_admin, created_at, updated_at
        FROM users
        WHERE id = $1
    `

	var user models.User
	err := database.DB.QueryRowContext(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.Name, &user.GoogleID, &user.AvatarURL,
		&user.IsActive, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	return &user, nil
}

// DeactivateUser marks a user as inactive
func DeactivateUser(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`
	_, err := database.DB.ExecContext(ctx, query, userID)
	return err
}

// CheckUserActive returns whether a user is active
func CheckUserActive(ctx context.Context, userID uuid.UUID) (bool, error) {
	var isActive bool
	query := `SELECT is_active FROM users WHERE id = $1`
	err := database.DB.QueryRowContext(ctx, query, userID).Scan(&isActive)
	if err == sql.ErrNoRows {
		return false, fmt.Errorf("user not found")
	}
	return isActive, err
}
