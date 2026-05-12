from fastapi import FastAPI

from src.database import lifespan
from src.routers.boards import router as boards_router
from src.routers.tasks import router as tasks_router

app = FastAPI(title="Task Board API", version="0.1.0", lifespan=lifespan)

app.include_router(tasks_router)
app.include_router(boards_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
