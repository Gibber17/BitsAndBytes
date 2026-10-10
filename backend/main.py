from dotenv import load_dotenv
load_dotenv()  # first, so API keys are available to everything below

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import food
# from routers import notes   # re-enable when ai_service.py is done

app = FastAPI(title="StudyFuel API")

# Allow your local React frontend to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(food.router, prefix="/api/food", tags=["Food"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}