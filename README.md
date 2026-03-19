# Road Trip Planner

Plan your next road trip by just describing what you want. Tell it something like "5 day Florida trip, beaches and good seafood" and it'll put together a full itinerary with real places, maps, and driving routes.

**Try it out:** https://roadtriplanner.vercel.app/

## What it does

- Type what kind of trip you want in plain English, get back a day-by-day plan
- All the places are real (pulled from Google Places) with ratings, photos, addresses
- See your whole route on a map with actual driving directions
- Save your favorites and trips with a sync code so you can pick up on another device
- Drag and drop to reorder stops, search to add your own places
- Export to Markdown or share a link

## Running it locally

You'll need:
- Node.js 20+
- Python 3.11+
- PostgreSQL
- OpenAI and Google Places API keys

### Backend

```bash
git clone https://github.com/henryzhan013/roadtrip-planner.git
cd roadtrip-planner

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Add your API keys to .env

cd api
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Built with

React, Vite, Leaflet for maps on the frontend. FastAPI, OpenAI, Google Places API, PostgreSQL on the backend.

## License

MIT
