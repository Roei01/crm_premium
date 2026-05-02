from fastapi import APIRouter, Request, HTTPException, Body, Query, status
from typing import List, Optional
from app.database import db
from app.models import TaskModel, CreateTaskDto, UpdateTaskDto
from bson import ObjectId
import re

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "tasks-service"}

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

    # Auto-create notification if task is assigned to someone
    if task_data.get("assigneeId") and task_data["assigneeId"] != user_id:
        await _send_task_notification(
            tenant_id=tenant_id,
            recipient_id=task_data["assigneeId"],
            task_title=task_data.get("title", ""),
            notification_type="TASK_ASSIGNED"
        )

    return created_task

@router.get("/", response_description="List tasks", response_model=List[TaskModel])
async def list_tasks(
    request: Request,
    search: Optional[str] = Query(None),
    task_status: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    assigneeId: Optional[str] = Query(None),
):
    tenant_id, _ = get_context(request)

    query: dict = {"tenantId": tenant_id}

    if task_status:
        query["status"] = task_status
    if priority:
        query["priority"] = priority
    if assigneeId:
        query["assigneeId"] = assigneeId
    if search:
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"title": {"$regex": pattern}},
            {"description": {"$regex": pattern}},
        ]

    tasks = await db.get_db()["tasks"].find(query).sort("createdAt", -1).to_list(1000)
    return tasks

@router.get("/{id}", response_description="Get a single task", response_model=TaskModel)
async def show_task(id: str, request: Request):
    tenant_id, _ = get_context(request)

    if (task := await db.get_db()["tasks"].find_one({"_id": ObjectId(id), "tenantId": tenant_id})) is not None:
        return task

    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@router.put("/{id}", response_description="Update a task", response_model=TaskModel)
async def update_task(id: str, request: Request, task: UpdateTaskDto = Body(...)):
    tenant_id, user_id = get_context(request)

    task_data = {k: v for k, v in task.model_dump().items() if v is not None}

    if len(task_data) >= 1:
        update_result = await db.get_db()["tasks"].update_one(
            {"_id": ObjectId(id), "tenantId": tenant_id},
            {"$set": task_data}
        )
        if update_result.modified_count == 1:
            updated_task = await db.get_db()["tasks"].find_one({"_id": ObjectId(id)})
            if updated_task is not None:
                # Notify assignee if assignment changed
                if "assigneeId" in task_data and task_data["assigneeId"] != user_id:
                    await _send_task_notification(
                        tenant_id=tenant_id,
                        recipient_id=task_data["assigneeId"],
                        task_title=updated_task.get("title", ""),
                        notification_type="TASK_ASSIGNED"
                    )
                return updated_task

    existing_task = await db.get_db()["tasks"].find_one({"_id": ObjectId(id), "tenantId": tenant_id})
    if existing_task is not None:
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

    total_tasks = await tasks_collection.count_documents({"tenantId": tenant_id, "assigneeId": user_id})
    todo_count = await tasks_collection.count_documents({"tenantId": tenant_id, "assigneeId": user_id, "status": "TODO"})
    in_progress_count = await tasks_collection.count_documents({"tenantId": tenant_id, "assigneeId": user_id, "status": "IN_PROGRESS"})
    done_count = await tasks_collection.count_documents({"tenantId": tenant_id, "assigneeId": user_id, "status": "DONE"})
    high_priority = await tasks_collection.count_documents({"tenantId": tenant_id, "assigneeId": user_id, "priority": "HIGH"})

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

async def _send_task_notification(tenant_id: str, recipient_id: str, task_title: str, notification_type: str):
    """Fire-and-forget notification to the notifications service."""
    import httpx
    import os
    notifications_url = os.getenv("NOTIFICATIONS_SERVICE_URL", "http://localhost:3005")
    payload = {
        "recipientId": recipient_id,
        "title": "New task assigned to you",
        "message": task_title,
        "type": notification_type,
        "tenantId": tenant_id,
    }
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{notifications_url}/notifications",
                json=payload,
                headers={"x-tenant-id": tenant_id, "x-user-id": "system"}
            )
    except Exception:
        pass  # Non-critical — don't fail the task operation
