from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    MONGODB_URI: str
    PORT_TASKS: int = 3003

    class Config:
        env_file = ".env"

settings = Settings()

class Database:
    client: AsyncIOMotorClient = None

    def connect(self):
        # We need to ensure we don't crash if env var is missing during build, but for runtime it's needed
        uri = os.getenv("MONGODB_URI")
        if not uri:
            print("Warning: MONGODB_URI not set")
            return
            
        self.client = AsyncIOMotorClient(uri)
        print("Connected to MongoDB (Tasks Service)")

    def get_db(self):
        return self.client.get_database("tasks_db") # Using a specific DB name or extraction from URI if preferred

db = Database()

