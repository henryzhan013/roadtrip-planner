import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripContext } from '../context/TripContext';

interface Destination {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  category: string;
  region: string;
  suggestedQuery: string;
}

// 50 road trip ideas balanced across the US
const allDestinations: Destination[] = [
  // TEXAS ONLY (8 trips)
  {
    id: 'austin',
    name: 'Austin',
    tagline: 'Live Music Capital of the World',
    description: 'Experience legendary 6th Street, world-class BBQ, and live music every night of the week.',
    image: '',
    category: 'music',
    region: 'texas',
    suggestedQuery: '3 day Austin TX live music and BBQ trip',
  },
  {
    id: 'fort-worth',
    name: 'Fort Worth Stockyards',
    tagline: 'Where the West Begins',
    description: 'Watch the daily cattle drive, explore historic saloons, and experience authentic cowboy culture.',
    image: '',
    category: 'cowboy',
    region: 'texas',
    suggestedQuery: '2 day Fort Worth Stockyards cowboy experience',
  },
  {
    id: 'san-antonio',
    name: 'San Antonio',
    tagline: 'Remember the Alamo',
    description: 'Walk the famous River Walk, visit the Alamo, and enjoy Tex-Mex at its finest.',
    image: '',
    category: 'culture',
    region: 'texas',
    suggestedQuery: '3 day San Antonio history and food tour',
  },
  {
    id: 'big-bend',
    name: 'Big Bend National Park',
    tagline: 'Where Texas Meets the Rio Grande',
    description: 'Hike through dramatic canyons, soak in hot springs, and stargaze under the darkest skies.',
    image: '',
    category: 'national-park',
    region: 'texas',
    suggestedQuery: '4 day Big Bend National Park adventure',
  },
  {
    id: 'hill-country',
    name: 'Texas Hill Country',
    tagline: 'Wine, Wildflowers & Small Towns',
    description: 'Drive through rolling hills, visit Fredericksburg and Luckenbach, and sample Texas wines.',
    image: '',
    category: 'road-trip',
    region: 'texas',
    suggestedQuery: '3 day Texas Hill Country wine and scenic drive',
  },
  {
    id: 'galveston',
    name: 'Galveston Island',
    tagline: 'Historic Beach Getaway',
    description: 'Explore Victorian architecture, relax on Gulf beaches, and visit Moody Gardens.',
    image: '',
    category: 'beach',
    region: 'texas',
    suggestedQuery: 'Weekend getaway to Galveston Island TX',
  },
  {
    id: 'south-padre',
    name: 'South Padre Island',
    tagline: 'Tropical Texas Paradise',
    description: 'Kiteboard, watch sea turtles, and enjoy the most tropical beaches in Texas.',
    image: '',
    category: 'beach',
    region: 'texas',
    suggestedQuery: '4 day South Padre Island beach vacation',
  },
  {
    id: 'marfa',
    name: 'Marfa & West Texas',
    tagline: 'Desert Art & Mystery Lights',
    description: 'Discover world-class art installations, watch for the mysterious Marfa lights, and explore the desert.',
    image: '',
    category: 'adventure',
    region: 'texas',
    suggestedQuery: 'West Texas road trip Marfa and desert art',
  },

  // TEXAS + NEIGHBORING STATES (8 trips)
  {
    id: 'texas-oklahoma',
    name: 'Texas to Oklahoma',
    tagline: 'Red River Road Trip',
    description: 'Drive from Dallas through cowboy country to OKC, exploring Route 66 and frontier history.',
    image: '',
    category: 'road-trip',
    region: 'texas-plus',
    suggestedQuery: '4 day Dallas to Oklahoma City road trip',
  },
  {
    id: 'texas-louisiana',
    name: 'Texas to New Orleans',
    tagline: 'Gulf Coast & Cajun Country',
    description: 'Road trip from Houston through Cajun Louisiana to the French Quarter.',
    image: '',
    category: 'road-trip',
    region: 'texas-plus',
    suggestedQuery: '5 day Houston to New Orleans Gulf Coast trip',
  },
  {
    id: 'texas-new-mexico',
    name: 'Texas to Santa Fe',
    tagline: 'High Desert Adventure',
    description: 'Journey from El Paso through White Sands to the art capital of the Southwest.',
    image: '',
    category: 'road-trip',
    region: 'texas-plus',
    suggestedQuery: '4 day El Paso to Santa Fe road trip',
  },
  {
    id: 'texas-arkansas',
    name: 'East Texas to Hot Springs',
    tagline: 'Piney Woods & Spa Country',
    description: 'Drive through the piney woods to historic Hot Springs National Park in Arkansas.',
    image: '',
    category: 'road-trip',
    region: 'texas-plus',
    suggestedQuery: '3 day East Texas to Hot Springs Arkansas trip',
  },
  {
    id: 'texas-mexico-border',
    name: 'Rio Grande Valley',
    tagline: 'Border Culture & Nature',
    description: 'Explore the unique border culture, birding spots, and beaches from Laredo to South Padre.',
    image: '',
    category: 'adventure',
    region: 'texas-plus',
    suggestedQuery: '4 day Rio Grande Valley road trip',
  },
  {
    id: 'amarillo-route66',
    name: 'Amarillo to Albuquerque',
    tagline: 'Route 66 Classic',
    description: 'Cruise the Mother Road from Cadillac Ranch through Tucumcari to Old Town Albuquerque.',
    image: '',
    category: 'road-trip',
    region: 'texas-plus',
    suggestedQuery: '3 day Amarillo to Albuquerque Route 66 trip',
  },
  {
    id: 'dallas-branson',
    name: 'Dallas to Branson',
    tagline: 'Shows & Ozark Mountains',
    description: 'Road trip from Dallas through the Ozarks to the live entertainment capital of the Midwest.',
    image: '',
    category: 'music',
    region: 'texas-plus',
    suggestedQuery: '4 day Dallas to Branson Missouri trip',
  },
  {
    id: 'texas-carlsbad',
    name: 'West Texas Cave Country',
    tagline: 'Desert Parks & Underground Wonders',
    description: 'Explore Guadalupe Mountains and Carlsbad Caverns across the Texas-New Mexico border.',
    image: '',
    category: 'national-park',
    region: 'texas-plus',
    suggestedQuery: '3 day Guadalupe Mountains and Carlsbad Caverns trip',
  },

  // SOUTHWEST (10 trips) - AZ, NM, NV, UT, CO
  {
    id: 'grand-canyon',
    name: 'Grand Canyon',
    tagline: 'One of the Seven Natural Wonders',
    description: 'Stand at the edge of a mile-deep canyon carved over millions of years by the Colorado River.',
    image: '',
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '3 day Grand Canyon South Rim adventure',
  },
  {
    id: 'sedona',
    name: 'Sedona',
    tagline: 'Red Rock Country',
    description: 'Experience stunning red rock formations, spiritual vortexes, and world-class hiking trails.',
    image: '',
    category: 'adventure',
    region: 'southwest',
    suggestedQuery: '3 day Sedona red rocks and spiritual retreat',
  },
  {
    id: 'monument-valley',
    name: 'Monument Valley',
    tagline: 'Iconic Western Landscape',
    description: 'Drive through the towering buttes and mesas that defined the American Western movie genre.',
    image: '',
    category: 'road-trip',
    region: 'southwest',
    suggestedQuery: '2 day Monument Valley scenic drive and Navajo tour',
  },
  {
    id: 'las-vegas',
    name: 'Las Vegas',
    tagline: 'Entertainment Capital of the World',
    description: 'Experience world-class shows, dining, and nightlife on the famous Strip.',
    image: '',
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '3 day Las Vegas entertainment and food trip',
  },
  {
    id: 'utah-mighty-five',
    name: 'Utah Mighty Five',
    tagline: 'Five National Parks, One Epic Trip',
    description: 'Visit Zion, Bryce, Capitol Reef, Canyonlands, and Arches in one unforgettable journey.',
    image: '',
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '7 day Utah Mighty Five national parks road trip',
  },
  {
    id: 'denver-rocky-mountain',
    name: 'Denver & Rocky Mountains',
    tagline: 'Mile High Adventure',
    description: 'Explore craft breweries, Red Rocks, and drive Trail Ridge Road through Rocky Mountain National Park.',
    image: '',
    category: 'adventure',
    region: 'southwest',
    suggestedQuery: '4 day Denver and Rocky Mountain National Park trip',
  },
  {
    id: 'santa-fe-taos',
    name: 'Santa Fe & Taos',
    tagline: 'Art, Adobe & High Desert',
    description: 'Explore world-class galleries, ancient pueblos, and legendary New Mexican cuisine.',
    image: '',
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '4 day Santa Fe and Taos art and culture trip',
  },
  {
    id: 'moab',
    name: 'Moab',
    tagline: 'Adventure Capital of Utah',
    description: 'Mountain bike slickrock, raft the Colorado River, and explore Arches and Canyonlands.',
    image: '',
    category: 'adventure',
    region: 'southwest',
    suggestedQuery: '4 day Moab Utah adventure trip',
  },
  {
    id: 'phoenix-scottsdale',
    name: 'Phoenix & Scottsdale',
    tagline: 'Desert Luxury & Golf',
    description: 'Enjoy world-class spas, championship golf, and Sonoran Desert hiking.',
    image: '',
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '3 day Phoenix Scottsdale spa and desert trip',
  },
  {
    id: 'albuquerque',
    name: 'Albuquerque',
    tagline: 'Balloon Fiesta & Breaking Bad',
    description: 'Hot air balloons, Old Town adobe, and the famous green chile of New Mexico.',
    image: '',
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '3 day Albuquerque culture and food trip',
  },

  // REST OF USA (24 trips)
  // Pacific Northwest (4)
  {
    id: 'pacific-coast-highway',
    name: 'Pacific Coast Highway',
    tagline: 'California Coastal Dream',
    description: 'Wind along dramatic cliffs from San Francisco to LA with stops at Big Sur and Hearst Castle.',
    image: '',
    category: 'road-trip',
    region: 'west',
    suggestedQuery: '5 day Pacific Coast Highway road trip',
  },
  {
    id: 'seattle-portland',
    name: 'Seattle to Portland',
    tagline: 'Pacific Northwest Coffee Trail',
    description: 'Explore two iconic cities, craft coffee culture, and stunning Cascade Mountain scenery.',
    image: '',
    category: 'culture',
    region: 'northwest',
    suggestedQuery: '4 day Seattle to Portland road trip',
  },
  {
    id: 'olympic-rainier',
    name: 'Olympic & Rainier',
    tagline: 'Rainforests to Glaciers',
    description: 'Experience temperate rainforests, rugged coastline, and the iconic Mount Rainier.',
    image: '',
    category: 'national-park',
    region: 'northwest',
    suggestedQuery: '5 day Olympic and Mount Rainier National Parks trip',
  },
  {
    id: 'oregon-coast',
    name: 'Oregon Coast',
    tagline: 'Rugged Beauty & Seafood',
    description: 'Drive past sea stacks, lighthouses, and charming coastal towns from Astoria to Brookings.',
    image: '',
    category: 'road-trip',
    region: 'northwest',
    suggestedQuery: '4 day Oregon Coast scenic road trip',
  },

  // California (3)
  {
    id: 'yosemite',
    name: 'Yosemite',
    tagline: 'Granite Cliffs & Giant Sequoias',
    description: 'Stand beneath El Capitan, watch Yosemite Falls, and walk among ancient giant sequoias.',
    image: '',
    category: 'national-park',
    region: 'west',
    suggestedQuery: '3 day Yosemite National Park adventure',
  },
  {
    id: 'san-diego',
    name: 'San Diego',
    tagline: 'Perfect Weather Paradise',
    description: 'Relax on beaches, visit the world-famous zoo, and explore the Gaslamp Quarter.',
    image: '',
    category: 'beach',
    region: 'west',
    suggestedQuery: '4 day San Diego beaches, zoo, and tacos trip',
  },
  {
    id: 'napa-sonoma',
    name: 'Napa & Sonoma',
    tagline: 'Wine Country Escape',
    description: 'Tour world-renowned wineries, enjoy farm-to-table dining, and soak in hot springs.',
    image: '',
    category: 'culture',
    region: 'west',
    suggestedQuery: '3 day Napa Valley wine country trip',
  },

  // Mountain West (3)
  {
    id: 'yellowstone',
    name: 'Yellowstone',
    tagline: "America's First National Park",
    description: 'Watch Old Faithful erupt, see prismatic hot springs, and spot bison, wolves, and grizzlies.',
    image: '',
    category: 'national-park',
    region: 'mountain',
    suggestedQuery: '5 day Yellowstone National Park wildlife and geysers trip',
  },
  {
    id: 'glacier',
    name: 'Glacier National Park',
    tagline: 'Crown of the Continent',
    description: 'Drive Going-to-the-Sun Road, hike to pristine alpine lakes, and see glaciers.',
    image: '',
    category: 'national-park',
    region: 'mountain',
    suggestedQuery: '4 day Glacier National Park Montana adventure',
  },
  {
    id: 'jackson-hole',
    name: 'Jackson Hole & Grand Teton',
    tagline: 'Wild West Mountain Paradise',
    description: 'Experience the Wild West town square, world-class skiing, and stunning Teton views.',
    image: '',
    category: 'adventure',
    region: 'mountain',
    suggestedQuery: '4 day Jackson Hole and Grand Teton adventure',
  },

  // Midwest (3)
  {
    id: 'chicago',
    name: 'Chicago',
    tagline: 'The Windy City',
    description: 'Deep dish pizza, world-class architecture, blues clubs, and lakefront beaches.',
    image: '',
    category: 'culture',
    region: 'midwest',
    suggestedQuery: '3 day Chicago food, architecture, and music trip',
  },
  {
    id: 'great-lakes',
    name: 'Great Lakes Circle',
    tagline: 'America\'s Fresh Coast',
    description: 'Drive along Lake Michigan through charming towns, dunes, and lighthouse country.',
    image: '',
    category: 'road-trip',
    region: 'midwest',
    suggestedQuery: '5 day Lake Michigan circle road trip',
  },
  {
    id: 'door-county',
    name: 'Door County',
    tagline: 'Midwest\'s Cape Cod',
    description: 'Cherry orchards, fish boils, lighthouses, and charming villages on a Wisconsin peninsula.',
    image: '',
    category: 'culture',
    region: 'midwest',
    suggestedQuery: '3 day Door County Wisconsin getaway',
  },

  // South (5)
  {
    id: 'nashville',
    name: 'Nashville',
    tagline: 'Music City USA',
    description: 'Experience the Grand Ole Opry, hot chicken, and honky tonks on Broadway.',
    image: '',
    category: 'music',
    region: 'south',
    suggestedQuery: '3 day Nashville music and food trip',
  },
  {
    id: 'new-orleans',
    name: 'New Orleans',
    tagline: 'The Big Easy',
    description: 'Jazz clubs, beignets, gumbo, and the most unique culture in America.',
    image: '',
    category: 'music',
    region: 'south',
    suggestedQuery: '4 day New Orleans jazz, food, and culture trip',
  },
  {
    id: 'memphis',
    name: 'Memphis',
    tagline: 'Home of the Blues & Rock n Roll',
    description: 'Visit Graceland, Sun Studio, and Beale Street where Elvis and B.B. King made history.',
    image: '',
    category: 'music',
    region: 'south',
    suggestedQuery: '3 day Memphis music history and BBQ trip',
  },
  {
    id: 'savannah-charleston',
    name: 'Savannah to Charleston',
    tagline: 'Southern Charm & Spanish Moss',
    description: 'Stroll through historic squares, antebellum architecture, and Lowcountry cuisine.',
    image: '',
    category: 'culture',
    region: 'south',
    suggestedQuery: '4 day Savannah to Charleston Southern road trip',
  },
  {
    id: 'great-smoky',
    name: 'Great Smoky Mountains',
    tagline: 'Most Visited National Park',
    description: 'Hike misty trails, spot black bears, and experience Appalachian culture in Gatlinburg.',
    image: '',
    category: 'national-park',
    region: 'south',
    suggestedQuery: '3 day Great Smoky Mountains hiking trip',
  },

  // Florida (2)
  {
    id: 'florida-keys',
    name: 'Florida Keys',
    tagline: 'Overseas Highway Paradise',
    description: 'Drive across the ocean on US-1, snorkel coral reefs, and catch sunset at Mallory Square.',
    image: '',
    category: 'beach',
    region: 'south',
    suggestedQuery: '4 day Florida Keys road trip to Key West',
  },
  {
    id: 'miami-everglades',
    name: 'Miami & Everglades',
    tagline: 'Art Deco & Alligators',
    description: 'South Beach nightlife, Cuban food in Little Havana, and airboat rides in the Glades.',
    image: '',
    category: 'adventure',
    region: 'south',
    suggestedQuery: '4 day Miami and Everglades adventure',
  },

  // Northeast (4)
  {
    id: 'new-england-fall',
    name: 'New England Fall Foliage',
    tagline: 'Peak Autumn Colors',
    description: 'Drive through Vermont and New Hampshire when the leaves explode in red, orange, and gold.',
    image: '',
    category: 'road-trip',
    region: 'northeast',
    suggestedQuery: '5 day New England fall foliage road trip',
  },
  {
    id: 'acadia',
    name: 'Acadia National Park',
    tagline: 'Where Mountains Meet the Sea',
    description: 'Watch sunrise from Cadillac Mountain, explore tide pools, and enjoy fresh Maine lobster.',
    image: '',
    category: 'national-park',
    region: 'northeast',
    suggestedQuery: '3 day Acadia National Park Maine trip',
  },
  {
    id: 'boston-freedom',
    name: 'Boston Freedom Trail',
    tagline: 'Walk Through American History',
    description: 'Follow the red brick road through 16 historic sites from the American Revolution.',
    image: '',
    category: 'culture',
    region: 'northeast',
    suggestedQuery: '3 day Boston history and seafood trip',
  },
  {
    id: 'nyc-hudson-valley',
    name: 'NYC to Hudson Valley',
    tagline: 'City Escape to Country',
    description: 'Leave Manhattan for charming river towns, farm breweries, and fall hiking.',
    image: '',
    category: 'road-trip',
    region: 'northeast',
    suggestedQuery: '3 day NYC to Hudson Valley weekend escape',
  },

  // Hawaii & Unique (2)
  {
    id: 'hawaii-road-to-hana',
    name: 'Road to Hana',
    tagline: 'Maui\'s Legendary Drive',
    description: '600+ curves, 50+ bridges, countless waterfalls, and black sand beaches await.',
    image: '',
    category: 'road-trip',
    region: 'hawaii',
    suggestedQuery: '2 day Road to Hana Maui adventure',
  },
  {
    id: 'blue-ridge',
    name: 'Blue Ridge Parkway',
    tagline: "America's Favorite Drive",
    description: 'Cruise through the Appalachian Mountains with stunning overlooks and mountain towns.',
    image: '',
    category: 'road-trip',
    region: 'south',
    suggestedQuery: '4 day Blue Ridge Parkway scenic drive',
  },
];
const categories = [
  { id: 'all', name: 'All', icon: '🌟' },
  { id: 'national-park', name: 'National Parks', icon: '🏞️' },
  { id: 'road-trip', name: 'Road Trips', icon: '🚗' },
  { id: 'music', name: 'Music & Nightlife', icon: '🎸' },
  { id: 'cowboy', name: 'Cowboy Culture', icon: '🤠' },
  { id: 'beach', name: 'Beaches', icon: '🏖️' },
  { id: 'adventure', name: 'Adventure', icon: '🥾' },
  { id: 'culture', name: 'Culture & Food', icon: '🏛️' },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomDestinations(): Destination[] {
  const texas = allDestinations.filter(d => d.region === 'texas');
  const texasPlus = allDestinations.filter(d => d.region === 'texas-plus');
  const southwest = allDestinations.filter(d => d.region === 'southwest');
  const otherRegions = allDestinations.filter(d =>
    !['texas', 'texas-plus', 'southwest'].includes(d.region)
  );

  const selected: Destination[] = [
    ...shuffleArray(texas).slice(0, 2),
    ...shuffleArray(texasPlus).slice(0, 1),
    ...shuffleArray(southwest).slice(0, 2),
    ...shuffleArray(otherRegions).slice(0, 3),
  ];

  return shuffleArray(selected);
}

export function ExplorePage() {
  const navigate = useNavigate();
  const { dispatch } = useTripContext();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredDestinations = useMemo(() => {
    return getRandomDestinations();
  }, []);

  const filteredDestinations = useMemo(() => {
    if (searchQuery || activeCategory !== 'all') {
      return allDestinations.filter(dest => {
        const matchesCategory = activeCategory === 'all' || dest.category === activeCategory;
        const matchesSearch =
          dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    }
    return featuredDestinations;
  }, [activeCategory, searchQuery, featuredDestinations]);

  const handleStartTrip = (destination: Destination) => {
    dispatch({ type: 'SET_QUERY', payload: destination.suggestedQuery });
    navigate('/plan?start=true');
  };

  // Gradient colors based on category
  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      'music': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'cowboy': 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
      'adventure': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      'national-park': 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
      'beach': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'culture': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'road-trip': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    };
    return gradients[category] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  // Emoji fallback based on category
  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'music': '🎸',
      'cowboy': '🤠',
      'adventure': '🥾',
      'national-park': '🏞️',
      'beach': '🏖️',
      'culture': '🏛️',
      'road-trip': '🚗',
    };
    return emojis[category] || '🗺️';
  };

  return (
    <div className="explore-page">
      <section className="explore-hero">
        <h1>Explore Road Trips</h1>
        <p className="explore-tagline">
          Discover epic adventures across America - from Texas honky tonks to national park wonders
        </p>

        <div className="explore-search">
          <input
            type="text"
            placeholder="Search 50+ destinations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="explore-search-input"
          />
        </div>
      </section>

      <section className="explore-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-name">{cat.name}</span>
          </button>
        ))}
      </section>

      <section className="explore-grid">
        {filteredDestinations.map((dest, index) => (
          <div
            key={dest.id}
            className="destination-card-new"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className="destination-icon-header"
              style={{ background: getCategoryGradient(dest.category) }}
            >
              <span className="destination-emoji">{getCategoryEmoji(dest.category)}</span>
            </div>
            <div className="destination-content-new">
              <h3 className="destination-name">{dest.name}</h3>
              <p className="destination-tagline">{dest.tagline}</p>
              <p className="destination-description">{dest.description}</p>
              <button
                className="btn btn-primary"
                onClick={() => handleStartTrip(dest)}
              >
                Plan This Trip
              </button>
            </div>
          </div>
        ))}
      </section>

      {filteredDestinations.length === 0 && (
        <div className="explore-empty">
          <span className="empty-icon">🔍</span>
          <h3>No destinations found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      )}

      <section className="explore-cta">
        <h2>Can't find what you're looking for?</h2>
        <p>Create a custom trip with our AI trip planner</p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/plan')}
        >
          Plan Custom Trip
        </button>
      </section>
    </div>
  );
}
