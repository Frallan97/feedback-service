package models

import (
	"time"

	"github.com/google/uuid"
)

type Application struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Description    string    `json:"description"`
	APIKey         string    `json:"api_key,omitempty"`
	IsActive       bool      `json:"is_active"`
	WebhookURL     *string   `json:"webhook_url,omitempty"`
	AllowedOrigins []string  `json:"allowed_origins"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Category struct {
	ID            int       `json:"id"`
	ApplicationID uuid.UUID `json:"application_id"`
	Name          string    `json:"name"`
	Color         string    `json:"color"`
	Icon          string    `json:"icon"`
	CreatedAt     time.Time `json:"created_at"`
}
