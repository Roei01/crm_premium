package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Notification struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Recipient  string             `json:"recipientId" bson:"recipientId"`
	Title      string             `json:"title" bson:"title"`
	Message    string             `json:"message" bson:"message"`
	Type       string             `json:"type" bson:"type"` // INFO, WARNING, TASK_ASSIGNED, etc.
	IsRead     bool               `json:"isRead" bson:"isRead"`
	TenantID   string             `json:"tenantId" bson:"tenantId"`
	Link       string             `json:"link,omitempty" bson:"link,omitempty"`
	EntityType string             `json:"entityType,omitempty" bson:"entityType,omitempty"` // task, customer, etc.
	EntityID   string             `json:"entityId,omitempty" bson:"entityId,omitempty"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
}
