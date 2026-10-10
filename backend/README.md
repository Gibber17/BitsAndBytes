main.py: starts FastAPI and configures CORS.

routers/notes.py: accepts image uploads.

routers/food.py: accepts food searches.

services/ai_service.py: communicates with the AI model.

services/places_service.py: communicates with your restaurant data provider.

.env: holds API keys locally; never commit it to GitHub.