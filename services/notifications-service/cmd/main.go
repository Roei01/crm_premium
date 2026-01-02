package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"github.com/roi/crm/notifications-service/internal/config"
	"github.com/roi/crm/notifications-service/internal/handlers"
)

func main() {
	// Load .env from root if possible, otherwise rely on Docker env
	_ = godotenv.Load("../../.env")

	config.ConnectDB()

	app := FiberApp()

	port := os.Getenv("PORT_NOTIFICATIONS")
	if port == "" {
		port = "3005"
	}

	log.Fatal(app.Listen(":" + port))
}

func FiberApp() *fiber.App {
	app := fiber.New()

	app.Use(logger.New())
	app.Use(cors.New())

	app.Get("/health", handlers.HealthCheck)

	// API Routes
	api := app.Group("/notifications")
	api.Post("/", handlers.CreateNotification)
	api.Get("/", handlers.ListNotifications)

	return app
}

