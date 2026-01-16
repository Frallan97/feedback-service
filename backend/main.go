package main

import (
	"log"
	"net/http"

	"github.com/casbin/casbin/v2"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"github.com/frallan97/fullstack-starter/backend/config"
	"github.com/frallan97/fullstack-starter/backend/database"
	"github.com/frallan97/fullstack-starter/backend/handlers"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	log.Println("Database connected successfully")

	// Run migrations
	if err := database.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Printf("Warning: Migration error: %v", err)
	}

	// Initialize GORM DB for Casbin adapter
	gormDB, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to open GORM database: %v", err)
	}

	// Initialize Casbin enforcer with GORM adapter
	adapter, err := gormadapter.NewAdapterByDB(gormDB)
	if err != nil {
		log.Fatalf("Failed to create Casbin adapter: %v", err)
	}

	enforcer, err := casbin.NewEnforcer(cfg.CasbinModelPath, adapter)
	if err != nil {
		log.Fatalf("Failed to create Casbin enforcer: %v", err)
	}

	// Load policies from database
	if err := enforcer.LoadPolicy(); err != nil {
		log.Fatalf("Failed to load Casbin policies: %v", err)
	}

	log.Println("Casbin enforcer initialized successfully")

	// Setup router with auth
	router := handlers.SetupRouter(cfg, enforcer)

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Starting server on %s (Environment: %s)", addr, cfg.Environment)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
