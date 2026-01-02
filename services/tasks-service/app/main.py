from fastapi import FastAPI
from app.routers import tasks
from app.database import db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.connect()
    yield
    # Shutdown
    if db.client:
        db.client.close()

app = FastAPI(title="Tasks Service", lifespan=lifespan)

app.include_router(tasks.router, tags=["tasks"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "tasks-service"}

