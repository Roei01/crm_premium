package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Notification struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Recipient string             `json:"recipientId" bson:"recipientId"`
	Title     string             `json:"title" bson:"title"`
	Message   string             `json:"message" bson:"message"`
	Type      string             `json:"type" bson:"type"` // e.g., INFO, WARNING, TASK_ASSIGNED
	IsRead    bool               `json:"isRead" bson:"isRead"`
	TenantID  string             `json:"tenantId" bson:"tenantId"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
}

