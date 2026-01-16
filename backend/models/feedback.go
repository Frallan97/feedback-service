package models

import (
	"time"

	"github.com/google/uuid"
)

type Feedback struct {
	ID            uuid.UUID              `json:"id"`
	ApplicationID uuid.UUID              `json:"application_id"`
	UserID        *uuid.UUID             `json:"user_id,omitempty"`
	CategoryID    *int                   `json:"category_id,omitempty"`
	Title         string                 `json:"title"`
	Content       string                 `json:"content"`
	Rating        *int                   `json:"rating,omitempty"`
	Status        string                 `json:"status"`
	Priority      string                 `json:"priority"`
	PageURL       string                 `json:"page_url"`
	BrowserInfo   map[string]interface{} `json:"browser_info,omitempty"`
	AppVersion    string                 `json:"app_version"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	ContactEmail  string                 `json:"contact_email"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
	ReviewedAt    *time.Time             `json:"reviewed_at,omitempty"`
	ResolvedAt    *time.Time             `json:"resolved_at,omitempty"`
}

type FeedbackComment struct {
	ID         uuid.UUID `json:"id"`
	FeedbackID uuid.UUID `json:"feedback_id"`
	UserID     uuid.UUID `json:"user_id"`
	Content    string    `json:"content"`
	IsInternal bool      `json:"is_internal"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type FeedbackAttachment struct {
	ID         uuid.UUID `json:"id"`
	FeedbackID uuid.UUID `json:"feedback_id"`
	FileURL    string    `json:"file_url"`
	FileType   string    `json:"file_type"`
	FileSize   int64     `json:"file_size"`
	CreatedAt  time.Time `json:"created_at"`
}
