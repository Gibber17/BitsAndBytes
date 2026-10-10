from dotenv import load_dotenv

load_dotenv()  # Load API keys before importing services.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import notes, food
from services import auth

app = FastAPI(title="StudyFuel API")

# Allow the local React frontend to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(food.router, prefix="/api/food", tags=["Food"])
app.include_router(auth.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
