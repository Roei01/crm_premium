from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, List
from datetime import datetime
from typing_extensions import Annotated

# Helper to handle ObjectId as string
PyObjectId = Annotated[str, BeforeValidator(str)]

class TaskModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: Optional[str] = None
    status: str = "TODO" # TODO, IN_PROGRESS, DONE
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH
    dueDate: Optional[datetime] = None
    
    # System fields (populated from context)
    tenantId: str
    createdBy: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_schema_extra = {
            "example": {
                "title": "Complete the report",
                "description": "Monthly sales report",
                "status": "TODO",
                "priority": "HIGH"
            }
        }

class CreateTaskDto(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "TODO"
    priority: Optional[str] = "MEDIUM"
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    dueDate: Optional[datetime] = None

class UpdateTaskDto(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    dueDate: Optional[datetime] = None

