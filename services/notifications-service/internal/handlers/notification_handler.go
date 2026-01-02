package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/roi/crm/notifications-service/internal/config"
	"github.com/roi/crm/notifications-service/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"service": "notifications-service",
	})
}

func CreateNotification(c *fiber.Ctx) error {
	// Context from Gateway headers
	tenantID := c.Get("x-tenant-id")
	if tenantID == "" {
		return c.Status(401).JSON(fiber.Map{"message": "Unauthorized"})
	}

	notification := new(models.Notification)
	if err := c.BodyParser(notification); err != nil {
		return c.Status(400).JSON(fiber.Map{"message": "Invalid input"})
	}

	notification.TenantID = tenantID
	notification.CreatedAt = time.Now()
	notification.IsRead = false

	coll := config.GetCollection("notifications")
	result, err := coll.InsertOne(c.Context(), notification)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Failed to create notification"})
	}

	notification.ID = result.InsertedID.(primitive.ObjectID)
	return c.Status(201).JSON(notification)
}

func ListNotifications(c *fiber.Ctx) error {
	tenantID := c.Get("x-tenant-id")
	userID := c.Get("x-user-id")

	if tenantID == "" || userID == "" {
		return c.Status(401).JSON(fiber.Map{"message": "Unauthorized"})
	}

	coll := config.GetCollection("notifications")
	filter := bson.M{
		"tenantId":    tenantID,
		"recipientId": userID,
	}

	cursor, err := coll.Find(c.Context(), filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Error fetching notifications"})
	}

	var notifications []models.Notification = make([]models.Notification, 0)
	if err := cursor.All(c.Context(), &notifications); err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Error parsing notifications"})
	}

	return c.JSON(notifications)
}

func MarkAsRead(c *fiber.Ctx) error {
	tenantID := c.Get("x-tenant-id")
	userID := c.Get("x-user-id")
	notificationID := c.Params("id")

	if tenantID == "" || userID == "" {
		return c.Status(401).JSON(fiber.Map{"message": "Unauthorized"})
	}

	objID, err := primitive.ObjectIDFromHex(notificationID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"message": "Invalid notification ID"})
	}

	coll := config.GetCollection("notifications")
	filter := bson.M{
		"_id":         objID,
		"tenantId":    tenantID,
		"recipientId": userID,
	}

	update := bson.M{
		"$set": bson.M{"isRead": true},
	}

	result, err := coll.UpdateOne(c.Context(), filter, update)
	if err != nil || result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"message": "Notification not found"})
	}

	return c.JSON(fiber.Map{"message": "Notification marked as read"})
}

func GetUnreadCount(c *fiber.Ctx) error {
	tenantID := c.Get("x-tenant-id")
	userID := c.Get("x-user-id")

	if tenantID == "" || userID == "" {
		return c.Status(401).JSON(fiber.Map{"message": "Unauthorized"})
	}

	coll := config.GetCollection("notifications")
	filter := bson.M{
		"tenantId":    tenantID,
		"recipientId": userID,
		"isRead":      false,
	}

	count, err := coll.CountDocuments(c.Context(), filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Error counting notifications"})
	}

	return c.JSON(fiber.Map{"unreadCount": count})
}

