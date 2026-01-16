package config

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	DatabaseURL     string
	Port            string
	Environment     string
	Debug           bool
	AuthServiceURL  string
	JWTPublicKey    *rsa.PublicKey
	JWTPublicKeyURL string
	AllowedOrigins  []string
	CasbinModelPath string
}

// Load reads configuration from environment variables
func Load() *Config {
	debug := os.Getenv("DEBUG") == "true"

	config := &Config{
		DatabaseURL:     getEnv("DATABASE_URL", "postgresql://feedbackuser:feedbackpass@localhost:5434/feedbackdb?sslmode=disable"),
		Port:            getEnv("PORT", "8082"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		Debug:           debug,
		AuthServiceURL:  getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		JWTPublicKeyURL: getEnv("JWT_PUBLIC_KEY_URL", ""),
		AllowedOrigins:  parseAllowedOrigins(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175")),
		CasbinModelPath: getEnv("CASBIN_MODEL_PATH", "./config/casbin_model.conf"),
	}

	// Fetch JWT public key from auth-service on startup
	if config.JWTPublicKeyURL == "" {
		config.JWTPublicKeyURL = config.AuthServiceURL + "/api/public-key"
	}

	publicKey, err := fetchPublicKey(config.JWTPublicKeyURL)
	if err != nil {
		log.Fatalf("Failed to fetch JWT public key: %v", err)
	}
	config.JWTPublicKey = publicKey

	if config.Debug {
		log.Printf("Configuration loaded: Environment=%s, Port=%s, AuthServiceURL=%s",
			config.Environment, config.Port, config.AuthServiceURL)
	}

	return config
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// fetchPublicKey fetches the JWT public key from the auth-service
func fetchPublicKey(url string) (*rsa.PublicKey, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch public key: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch public key: status %d", resp.StatusCode)
	}

	pemBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read public key: %w", err)
	}

	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	publicKey, err := x509.ParsePKCS1PublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	return publicKey, nil
}

// parseAllowedOrigins parses comma-separated allowed origins
func parseAllowedOrigins(origins string) []string {
	if origins == "" {
		return []string{}
	}

	parts := strings.Split(origins, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	return result
}
