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
    user_role = request.headers.get("x-user-role")
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="Missing user context")
    return tenant_id, user_id, user_role

@router.post("/", response_description="Add new task", response_model=TaskModel)
async def create_task(request: Request, task: CreateTaskDto = Body(...)):
    tenant_id, user_id, user_role = get_context(request)
    
    # Only ADMIN and TEAM_LEAD can create tasks
    if user_role not in ["ADMIN", "TEAM_LEAD"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or TEAM_LEAD can create tasks")
    
    task_data = task.model_dump()
    task_data["tenantId"] = tenant_id
    task_data["createdBy"] = user_id
    
    new_task = await db.get_db()["tasks"].insert_one(task_data)
    created_task = await db.get_db()["tasks"].find_one({"_id": new_task.inserted_id})
    return created_task

@router.get("/", response_description="List tasks", response_model=List[TaskModel])
async def list_tasks(request: Request):
    tenant_id, user_id, user_role = get_context(request)
    
    # ADMIN and TEAM_LEAD see all tasks in their tenant
    if user_role in ["ADMIN", "TEAM_LEAD"]:
        tasks = await db.get_db()["tasks"].find({"tenantId": tenant_id}).to_list(1000)
    else:
        # EMPLOYEE sees only tasks assigned to them
        tasks = await db.get_db()["tasks"].find({"tenantId": tenant_id, "assigneeId": user_id}).to_list(1000)
    
    return tasks

@router.get("/{id}", response_description="Get a single task", response_model=TaskModel)
async def show_task(id: str, request: Request):
    tenant_id, user_id, user_role = get_context(request)
    
    # EMPLOYEE can only see their own tasks
    query = {"_id": ObjectId(id), "tenantId": tenant_id}
    if user_role == "EMPLOYEE":
        query["assigneeId"] = user_id
    
    if (task := await db.get_db()["tasks"].find_one(query)) is not None:
        return task
        
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@router.put("/{id}", response_description="Update a task", response_model=TaskModel)
async def update_task(id: str, request: Request, task: UpdateTaskDto = Body(...)):
    tenant_id, user_id, user_role = get_context(request)
    
    # Only ADMIN and TEAM_LEAD can update tasks
    if user_role not in ["ADMIN", "TEAM_LEAD"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or TEAM_LEAD can update tasks")
    
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
    tenant_id, user_id, user_role = get_context(request)
    
    # Only ADMIN and TEAM_LEAD can delete tasks
    if user_role not in ["ADMIN", "TEAM_LEAD"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or TEAM_LEAD can delete tasks")
    
    delete_result = await db.get_db()["tasks"].delete_one({"_id": ObjectId(id), "tenantId": tenant_id})
    
    if delete_result.deleted_count == 1:
        return {"status": "success", "message": "Task deleted"}
        
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@router.get("/stats/user/{user_id}", response_description="Get user task statistics")
async def get_user_stats(user_id: str, request: Request):
    tenant_id, requesting_user_id, user_role = get_context(request)
    
    # Users can only see their own stats unless they are ADMIN/TEAM_LEAD
    if user_role not in ["ADMIN", "TEAM_LEAD"] and requesting_user_id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own statistics")
    
    tasks = await db.get_db()["tasks"].find({
        "tenantId": tenant_id,
        "assigneeId": user_id
    }).to_list(1000)
    
    total = len(tasks)
    todo = len([t for t in tasks if t.get("status") == "TODO"])
    in_progress = len([t for t in tasks if t.get("status") == "IN_PROGRESS"])
    done = len([t for t in tasks if t.get("status") == "DONE"])
    
    high_priority = len([t for t in tasks if t.get("priority") == "HIGH"])
    medium_priority = len([t for t in tasks if t.get("priority") == "MEDIUM"])
    low_priority = len([t for t in tasks if t.get("priority") == "LOW"])
    
    return {
        "userId": user_id,
        "total": total,
        "byStatus": {
            "TODO": todo,
            "IN_PROGRESS": in_progress,
            "DONE": done
        },
        "byPriority": {
            "HIGH": high_priority,
            "MEDIUM": medium_priority,
            "LOW": low_priority
        }
    }

@router.get("/stats/overview", response_description="Get overview statistics (ADMIN/TEAM_LEAD only)")
async def get_overview_stats(request: Request):
    tenant_id, user_id, user_role = get_context(request)
    
    # Only ADMIN and TEAM_LEAD can see overview
    if user_role not in ["ADMIN", "TEAM_LEAD"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or TEAM_LEAD can view overview statistics")
    
    tasks = await db.get_db()["tasks"].find({"tenantId": tenant_id}).to_list(1000)
    
    total = len(tasks)
    todo = len([t for t in tasks if t.get("status") == "TODO"])
    in_progress = len([t for t in tasks if t.get("status") == "IN_PROGRESS"])
    done = len([t for t in tasks if t.get("status") == "DONE"])
    
    high_priority = len([t for t in tasks if t.get("priority") == "HIGH"])
    medium_priority = len([t for t in tasks if t.get("priority") == "MEDIUM"])
    low_priority = len([t for t in tasks if t.get("priority") == "LOW"])
    
    return {
        "total": total,
        "byStatus": {
            "TODO": todo,
            "IN_PROGRESS": in_progress,
            "DONE": done
        },
        "byPriority": {
            "HIGH": high_priority,
            "MEDIUM": medium_priority,
            "LOW": low_priority
        }
    }

