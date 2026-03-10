# Road Trip Planner

An AI-powered road trip planning application that helps you create personalized multi-day itineraries with real places, interactive maps, and driving routes.

## Features

- **AI-Powered Planning** - Describe your ideal trip in natural language (e.g., "5 day Florida beaches and seafood") and get a complete itinerary
- **Real Places** - All recommendations come from Google Places API with actual ratings, photos, and addresses
- **Interactive Maps** - Visualize your route with Leaflet maps and real driving directions via OSRM
- **Multi-Day Itineraries** - Organized day-by-day plans with attractions, restaurants, activities, and hotels
- **Cross-Device Sync** - Save favorites and trips with a sync code to access from any device
- **Trip Customization** - Add, remove, and reorder stops; search for custom places to add
- **Booking Links** - Quick links to Google Maps, directions, Yelp, and reservations
- **Export & Share** - Download trips as Markdown or share via URL

## Tech Stack

### Frontend
- React 19
- Vite with Rolldown
- Leaflet / React-Leaflet for maps
- CSS3 with responsive design

### Backend
- FastAPI (Python)
- OpenAI API for trip planning
- Google Places API for location data
- PostgreSQL with SQLAlchemy
- OSRM for route calculation

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL
- OpenAI API key
- Google Places API key

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/roadtrip-planner.git
cd roadtrip-planner
```

2. Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up environment variables (copy `.env.example` to `.env`):
```bash
cp .env.example .env
```

Required environment variables:
```
OPENAI_API_KEY=your_openai_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/roadtrip
```

4. Run the backend:
```bash
cd api
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Required:
```
VITE_API_URL=http://localhost:8000
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/plan` | Generate AI-powered trip itinerary |
| GET | `/search` | Search for places |
| POST | `/sync/create` | Create a new sync code |
| GET | `/favorites/{sync_code}` | Get user's favorites |
| POST | `/favorites/{sync_code}` | Add a favorite |
| DELETE | `/favorites/{sync_code}/{place_id}` | Remove a favorite |
| GET | `/trips/{sync_code}` | Get saved trips |
| POST | `/trips/{sync_code}` | Save a trip |
| DELETE | `/trips/{sync_code}/{trip_id}` | Delete a trip |

## Project Structure

```
roadtrip-planner/
├── api/
│   ├── main.py          # FastAPI application
│   └── tests/           # Backend tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main application component
│   │   ├── Map.jsx      # Leaflet map component
│   │   ├── PlaceCard.jsx # Place card component
│   │   └── index.css    # Global styles
│   └── package.json
├── requirements.txt
└── README.md
```

## License

MIT
