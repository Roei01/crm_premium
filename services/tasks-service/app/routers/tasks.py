from fastapi import APIRouter, Request, HTTPException, Body, status
from typing import List
from app.database import db
from app.models import TaskModel, CreateTaskDto, UpdateTaskDto
from bson import ObjectId

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "tasks-service"}

# Helper to get tenant context
def get_context(request: Request):
    tenant_id = request.headers.get("x-tenant-id")
    user_id = request.headers.get("x-user-id")
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="Missing user context")
    return tenant_id, user_id

@router.post("/", response_description="Add new task", response_model=TaskModel)
async def create_task(request: Request, task: CreateTaskDto = Body(...)):
    tenant_id, user_id = get_context(request)
    
    task_data = task.model_dump()
    task_data["tenantId"] = tenant_id
    task_data["createdBy"] = user_id
    
    new_task = await db.get_db()["tasks"].insert_one(task_data)
    created_task = await db.get_db()["tasks"].find_one({"_id": new_task.inserted_id})
    return created_task

@router.get("/", response_description="List tasks", response_model=List[TaskModel])
async def list_tasks(request: Request):
    tenant_id, user_id = get_context(request)
    # Filter by tenantId mandatory
    tasks = await db.get_db()["tasks"].find({"tenantId": tenant_id}).to_list(1000)
    return tasks

@router.get("/{id}", response_description="Get a single task", response_model=TaskModel)
async def show_task(id: str, request: Request):
    tenant_id, _ = get_context(request)
    
    if (task := await db.get_db()["tasks"].find_one({"_id": ObjectId(id), "tenantId": tenant_id})) is not None:
        return task
        
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@router.put("/{id}", response_description="Update a task", response_model=TaskModel)
async def update_task(id: str, request: Request, task: UpdateTaskDto = Body(...)):
    tenant_id, _ = get_context(request)
    
    task_data = {k: v for k, v in task.model_dump().items() if v is not None}
    
    if len(task_data) >= 1:
        update_result = await db.get_db()["tasks"].update_one(
            {"_id": ObjectId(id), "tenantId": tenant_id}, 
            {"$set": task_data}
        )
        if update_result.modified_count == 1:
            if (updated_task := await db.get_db()["tasks"].find_one({"_id": ObjectId(id)})) is not None:
                return updated_task
    
    if (existing_task := await db.get_db()["tasks"].find_one({"_id": ObjectId(id), "tenantId": tenant_id})) is not None:
        return existing_task
        
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@router.delete("/{id}", response_description="Delete a task")
async def delete_task(id: str, request: Request):
    tenant_id, _ = get_context(request)
    
    delete_result = await db.get_db()["tasks"].delete_one({"_id": ObjectId(id), "tenantId": tenant_id})
    
    if delete_result.deleted_count == 1:
        return {"status": "success", "message": "Task deleted"}
        
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@router.get("/stats/user/{user_id}", response_description="Get user task statistics")
async def get_user_stats(user_id: str, request: Request):
    tenant_id, _ = get_context(request)
    
    tasks_collection = db.get_db()["tasks"]
    
    # Count tasks by status
    total_tasks = await tasks_collection.count_documents({
        "tenantId": tenant_id,
        "assigneeId": user_id
    })
    
    todo_count = await tasks_collection.count_documents({
        "tenantId": tenant_id,
        "assigneeId": user_id,
        "status": "TODO"
    })
    
    in_progress_count = await tasks_collection.count_documents({
        "tenantId": tenant_id,
        "assigneeId": user_id,
        "status": "IN_PROGRESS"
    })
    
    done_count = await tasks_collection.count_documents({
        "tenantId": tenant_id,
        "assigneeId": user_id,
        "status": "DONE"
    })
    
    # Count by priority
    high_priority = await tasks_collection.count_documents({
        "tenantId": tenant_id,
        "assigneeId": user_id,
        "priority": "HIGH"
    })
    
    # Count overdue tasks
    from datetime import datetime
    overdue_count = await tasks_collection.count_documents({
        "tenantId": tenant_id,
        "assigneeId": user_id,
        "dueDate": {"$lt": datetime.utcnow()},
        "status": {"$ne": "DONE"}
    })
    
    return {
        "userId": user_id,
        "totalTasks": total_tasks,
        "todoTasks": todo_count,
        "inProgressTasks": in_progress_count,
        "completedTasks": done_count,
        "highPriorityTasks": high_priority,
        "overdueTasks": overdue_count
    }

@router.get("/stats/overview", response_description="Get tenant-wide task overview")
async def get_tenant_stats(request: Request):
    tenant_id, _ = get_context(request)
    
    tasks_collection = db.get_db()["tasks"]
    
    # Aggregate by assignee
    pipeline = [
        {"$match": {"tenantId": tenant_id}},
        {"$group": {
            "_id": "$assigneeId",
            "assigneeName": {"$first": "$assigneeName"},
            "totalTasks": {"$sum": 1},
            "completedTasks": {
                "$sum": {"$cond": [{"$eq": ["$status", "DONE"]}, 1, 0]}
            }
        }}
    ]
    
    cursor = tasks_collection.aggregate(pipeline)
    results = await cursor.to_list(None)
    
    return {"stats": results}

