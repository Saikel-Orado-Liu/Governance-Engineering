from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import lifespan
from src.exceptions import add_exception_handlers
from src.logger import setup_logging
from src.middleware import RequestIDMiddleware
from src.routers.auth import router as auth_router
from src.routers.boards import router as boards_router
from src.routers.tasks import router as tasks_router

# Configure structured logging early
setup_logging(settings.LOG_LEVEL)

app = FastAPI(title="Task Board API", version="0.1.0", lifespan=lifespan)

# Parse CORS origins from comma-separated environment variable
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID middleware — after CORS so it wraps all application routes
app.add_middleware(RequestIDMiddleware)

# Register global structured exception handlers
add_exception_handlers(app)

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(boards_router)


@app.get(f"{settings.API_PREFIX}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
