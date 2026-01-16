package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user synced from auth-service
type User struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Name      string     `json:"name"`
	GoogleID  *string    `json:"google_id,omitempty"`
	AvatarURL *string    `json:"avatar_url,omitempty"`
	IsActive  bool       `json:"is_active"`
	IsAdmin   bool       `json:"is_admin"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}
