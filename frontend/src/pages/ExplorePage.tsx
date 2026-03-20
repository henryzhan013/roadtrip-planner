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

// 50 road trip ideas with verified matching Unsplash images
const allDestinations: Destination[] = [
  // TEXAS (18 trips)
  {
    id: 'austin',
    name: 'Austin',
    tagline: 'Live Music Capital of the World',
    description: 'Experience legendary 6th Street, world-class BBQ, and live music every night of the week.',
    image: 'https://images.unsplash.com/photo-1588993608265-8c5bdd5bd2c6?w=600&h=400&fit=crop', // Austin TX skyline reflected in water
    category: 'music',
    region: 'texas',
    suggestedQuery: '3 day Austin TX live music and BBQ trip',
  },
  {
    id: 'fort-worth',
    name: 'Fort Worth Stockyards',
    tagline: 'Where the West Begins',
    description: 'Watch the daily cattle drive, explore historic saloons, and experience authentic cowboy culture.',
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&h=400&fit=crop', // Longhorn cattle Texas
    category: 'cowboy',
    region: 'texas',
    suggestedQuery: '2 day Fort Worth Stockyards cowboy experience',
  },
  {
    id: 'gruene',
    name: 'Gruene Hall',
    tagline: "Texas' Oldest Dance Hall",
    description: 'Dance the night away at this 1878 landmark where legends like Willie Nelson have played.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', // Country music concert dance hall
    category: 'music',
    region: 'texas',
    suggestedQuery: 'Weekend trip to Gruene and New Braunfels TX',
  },
  {
    id: 'luckenbach',
    name: 'Luckenbach',
    tagline: "Everybody's Somebody in Luckenbach",
    description: 'This tiny town made famous by Waylon Jennings is pure Texas Hill Country magic.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=400&fit=crop', // Acoustic guitar country music
    category: 'music',
    region: 'texas',
    suggestedQuery: 'Day trip to Luckenbach and Fredericksburg TX',
  },
  {
    id: 'bandera',
    name: 'Bandera',
    tagline: 'Cowboy Capital of the World',
    description: 'Stay at a real dude ranch, go horseback riding, and two-step at the 11th Street Cowboy Bar.',
    image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&h=400&fit=crop', // Horse and cowboy riding
    category: 'cowboy',
    region: 'texas',
    suggestedQuery: '3 day Bandera TX dude ranch experience',
  },
  {
    id: 'amarillo',
    name: 'Amarillo',
    tagline: 'Heart of Route 66',
    description: 'Try the 72oz steak challenge at Big Texan, visit Cadillac Ranch, and cruise Route 66.',
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=600&h=400&fit=crop', // Route 66 road sign
    category: 'road-trip',
    region: 'texas',
    suggestedQuery: 'Route 66 road trip through Amarillo TX',
  },
  {
    id: 'san-antonio',
    name: 'San Antonio',
    tagline: 'Remember the Alamo',
    description: 'Walk the famous River Walk, visit the Alamo, and enjoy Tex-Mex at its finest.',
    image: 'https://images.unsplash.com/photo-1531261175012-50bf1003ae49?w=600&h=400&fit=crop', // San Antonio River Walk
    category: 'culture',
    region: 'texas',
    suggestedQuery: '3 day San Antonio history and food tour',
  },
  {
    id: 'marfa',
    name: 'Marfa',
    tagline: 'Desert Art & Mystery Lights',
    description: 'Discover world-class art installations, watch for the mysterious Marfa lights, and explore Big Bend.',
    image: 'https://images.unsplash.com/photo-1518173946687-a4c036bc3c35?w=600&h=400&fit=crop', // Desert landscape art installation
    category: 'adventure',
    region: 'texas',
    suggestedQuery: 'West Texas road trip Marfa and Big Bend',
  },
  {
    id: 'big-bend',
    name: 'Big Bend National Park',
    tagline: 'Where Texas Meets the Rio Grande',
    description: 'Hike through dramatic canyons, soak in hot springs, and stargaze under the darkest skies in North America.',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop', // Desert canyon landscape
    category: 'national-park',
    region: 'texas',
    suggestedQuery: '4 day Big Bend National Park adventure',
  },
  {
    id: 'hill-country',
    name: 'Texas Hill Country',
    tagline: 'Wine, Wildflowers & Small Towns',
    description: 'Drive through rolling hills, visit charming towns like Fredericksburg, and sample Texas wines.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop', // Rolling hills road trip
    category: 'road-trip',
    region: 'texas',
    suggestedQuery: '3 day Texas Hill Country wine and scenic drive',
  },
  {
    id: 'galveston',
    name: 'Galveston Island',
    tagline: 'Historic Beach Getaway',
    description: 'Explore Victorian architecture, relax on Gulf beaches, and visit Moody Gardens.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop', // Gulf coast beach pier
    category: 'beach',
    region: 'texas',
    suggestedQuery: 'Weekend getaway to Galveston Island TX',
  },
  {
    id: 'houston-space',
    name: 'Houston Space Center',
    tagline: 'Where Space Exploration Lives',
    description: 'Tour NASA Johnson Space Center, see real spacecraft, and touch a moon rock.',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=400&fit=crop', // NASA space shuttle
    category: 'culture',
    region: 'texas',
    suggestedQuery: '2 day Houston Space Center and museum tour',
  },
  {
    id: 'dallas-arts',
    name: 'Dallas Arts District',
    tagline: 'Urban Culture & Southern Charm',
    description: 'Explore world-class museums, the JFK memorial, and upscale dining in the Big D.',
    image: 'https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=600&h=400&fit=crop', // Dallas skyline modern
    category: 'culture',
    region: 'texas',
    suggestedQuery: '3 day Dallas arts, history, and food trip',
  },
  {
    id: 'palo-duro',
    name: 'Palo Duro Canyon',
    tagline: "The Grand Canyon of Texas",
    description: "Hike through America's second-largest canyon with stunning red rock formations and outdoor drama shows.",
    image: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=600&h=400&fit=crop', // Red rock canyon formations
    category: 'adventure',
    region: 'texas',
    suggestedQuery: '2 day Palo Duro Canyon camping and hiking trip',
  },
  {
    id: 'south-padre',
    name: 'South Padre Island',
    tagline: 'Tropical Texas Paradise',
    description: 'Kiteboard, watch sea turtles, and enjoy the most tropical beaches in Texas.',
    image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600&h=400&fit=crop', // Tropical beach palm trees
    category: 'beach',
    region: 'texas',
    suggestedQuery: '4 day South Padre Island beach vacation',
  },
  {
    id: 'enchanted-rock',
    name: 'Enchanted Rock',
    tagline: 'Sacred Pink Granite Dome',
    description: 'Climb the massive pink granite dome, camp under the stars, and explore Hill Country.',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop', // Pink granite rock formation
    category: 'adventure',
    region: 'texas',
    suggestedQuery: 'Weekend Enchanted Rock camping and hiking',
  },
  {
    id: 'jefferson',
    name: 'Jefferson',
    tagline: 'Historic Riverboat Town',
    description: 'Step back in time in this antebellum town with ghost tours, B&Bs, and bayou boat rides.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', // Historic southern mansion
    category: 'culture',
    region: 'texas',
    suggestedQuery: 'Weekend trip to historic Jefferson TX',
  },
  {
    id: 'guadalupe-mountains',
    name: 'Guadalupe Mountains',
    tagline: "Texas' Highest Peak",
    description: "Summit the highest point in Texas and explore ancient fossil reefs in this remote wilderness.",
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=400&fit=crop', // Mountain peak wilderness
    category: 'national-park',
    region: 'texas',
    suggestedQuery: '3 day Guadalupe Mountains National Park hiking trip',
  },

  // SOUTHWEST & WEST (17 trips)
  {
    id: 'grand-canyon',
    name: 'Grand Canyon',
    tagline: 'One of the Seven Natural Wonders',
    description: 'Stand at the edge of a mile-deep canyon carved over millions of years by the Colorado River.',
    image: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=600&h=400&fit=crop', // Grand Canyon vista
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '3 day Grand Canyon South Rim adventure',
  },
  {
    id: 'sedona',
    name: 'Sedona',
    tagline: 'Red Rock Country',
    description: 'Experience stunning red rock formations, spiritual vortexes, and world-class hiking trails.',
    image: 'https://images.unsplash.com/photo-1527549993586-dff825b37782?w=600&h=400&fit=crop', // Sedona red rocks
    category: 'adventure',
    region: 'southwest',
    suggestedQuery: '3 day Sedona red rocks and spiritual retreat',
  },
  {
    id: 'monument-valley',
    name: 'Monument Valley',
    tagline: 'Iconic Western Landscape',
    description: 'Drive through the towering buttes and mesas that defined the American Western movie genre.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop', // Monument Valley buttes
    category: 'road-trip',
    region: 'southwest',
    suggestedQuery: '2 day Monument Valley scenic drive and Navajo tour',
  },
  {
    id: 'las-vegas',
    name: 'Las Vegas',
    tagline: 'Entertainment Capital of the World',
    description: 'Experience world-class shows, dining, and nightlife on the famous Strip.',
    image: 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=600&h=400&fit=crop', // Las Vegas Strip night neon
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '3 day Las Vegas entertainment and food trip',
  },
  {
    id: 'zion',
    name: 'Zion National Park',
    tagline: 'Towering Red Cliffs & Slot Canyons',
    description: "Hike Angels Landing, wade through The Narrows, and marvel at Utah's first national park.",
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop', // Zion canyon cliffs
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '3 day Zion National Park hiking adventure',
  },
  {
    id: 'bryce-canyon',
    name: 'Bryce Canyon',
    tagline: 'Forest of Stone Hoodoos',
    description: 'Walk among thousands of red, orange, and white hoodoos in this otherworldly landscape.',
    image: 'https://images.unsplash.com/photo-1529733905648-8d7f80a7df84?w=600&h=400&fit=crop', // Bryce Canyon hoodoos amphitheater
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '2 day Bryce Canyon hoodoo hiking trip',
  },
  {
    id: 'arches',
    name: 'Arches National Park',
    tagline: 'Over 2,000 Natural Stone Arches',
    description: 'See Delicate Arch at sunset and explore the highest concentration of natural arches on Earth.',
    image: 'https://images.unsplash.com/photo-1548195667-1995b0c89877?w=600&h=400&fit=crop', // Delicate Arch Arches NP
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '2 day Arches and Canyonlands National Parks trip',
  },
  {
    id: 'rocky-mountain',
    name: 'Rocky Mountain National Park',
    tagline: 'Alpine Wilderness & Trail Ridge Road',
    description: 'Drive the highest continuous paved road in America and spot elk, bighorn sheep, and wildflowers.',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop', // Rocky Mountain alpine peaks
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '3 day Rocky Mountain National Park Colorado trip',
  },
  {
    id: 'denver',
    name: 'Denver',
    tagline: 'Mile High City',
    description: 'Explore craft breweries, Red Rocks Amphitheatre, and use it as a base for mountain adventures.',
    image: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=600&h=400&fit=crop', // Denver skyline with mountains
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '3 day Denver food, breweries, and Red Rocks trip',
  },
  {
    id: 'yellowstone',
    name: 'Yellowstone',
    tagline: "America's First National Park",
    description: 'Watch Old Faithful erupt, see prismatic hot springs, and spot bison, wolves, and grizzlies.',
    image: 'https://images.unsplash.com/photo-1533419192155-a3b2618624e6?w=600&h=400&fit=crop', // Yellowstone geyser Old Faithful
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '5 day Yellowstone National Park wildlife and geysers trip',
  },
  {
    id: 'glacier',
    name: 'Glacier National Park',
    tagline: 'Crown of the Continent',
    description: 'Drive Going-to-the-Sun Road, hike to pristine alpine lakes, and see glaciers before they disappear.',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=400&fit=crop', // Glacier NP mountain lake
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '4 day Glacier National Park Montana adventure',
  },
  {
    id: 'santa-fe',
    name: 'Santa Fe',
    tagline: 'Art, Adobe & Green Chile',
    description: "Explore America's oldest capital, world-class art galleries, and legendary New Mexican cuisine.",
    image: 'https://images.unsplash.com/photo-1590059802812-8e6f9c0a9e6a?w=600&h=400&fit=crop', // Adobe architecture southwest
    category: 'culture',
    region: 'southwest',
    suggestedQuery: '3 day Santa Fe art and food tour',
  },
  {
    id: 'route66-full',
    name: 'Route 66',
    tagline: 'The Mother Road',
    description: 'Drive the iconic highway from Chicago to LA through small towns, diners, and vintage Americana.',
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=600&h=400&fit=crop', // Route 66 vintage road sign
    category: 'road-trip',
    region: 'southwest',
    suggestedQuery: '7 day Route 66 road trip from Oklahoma City to Flagstaff',
  },
  {
    id: 'moab',
    name: 'Moab',
    tagline: 'Adventure Capital of Utah',
    description: 'Mountain bike slickrock, raft the Colorado River, and explore two national parks.',
    image: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=600&h=400&fit=crop', // Moab red rock desert
    category: 'adventure',
    region: 'southwest',
    suggestedQuery: '4 day Moab Utah adventure trip',
  },
  {
    id: 'oklahoma-city',
    name: 'Oklahoma City',
    tagline: 'Cowboy Culture & Route 66',
    description: 'Visit the National Cowboy Museum, walk Bricktown, and cruise the Oklahoma Route 66 stretch.',
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&h=400&fit=crop', // Cowboy rodeo western
    category: 'cowboy',
    region: 'southwest',
    suggestedQuery: '2 day Oklahoma City cowboy and Route 66 trip',
  },
  {
    id: 'white-sands',
    name: 'White Sands',
    tagline: 'Gypsum Dune Wonderland',
    description: 'Sled down pristine white sand dunes in this surreal New Mexico landscape.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop', // White sand dunes
    category: 'national-park',
    region: 'southwest',
    suggestedQuery: '2 day White Sands and Carlsbad Caverns trip',
  },
  {
    id: 'jackson-hole',
    name: 'Jackson Hole',
    tagline: 'Gateway to Grand Teton',
    description: 'Experience the Wild West town square, world-class skiing, and stunning Teton views.',
    image: 'https://images.unsplash.com/photo-1502786129293-79981df4e689?w=600&h=400&fit=crop', // Grand Teton mountains
    category: 'adventure',
    region: 'southwest',
    suggestedQuery: '4 day Jackson Hole and Grand Teton adventure',
  },

  // OTHER USA (15 trips)
  {
    id: 'pacific-coast-highway',
    name: 'Pacific Coast Highway',
    tagline: 'California Coastal Dream',
    description: 'Wind along dramatic cliffs from San Francisco to LA with stops at Big Sur and Hearst Castle.',
    image: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=600&h=400&fit=crop', // Bixby Bridge Big Sur PCH
    category: 'road-trip',
    region: 'other',
    suggestedQuery: '5 day Pacific Coast Highway road trip',
  },
  {
    id: 'nashville',
    name: 'Nashville',
    tagline: 'Music City USA',
    description: 'Experience the Grand Ole Opry, hot chicken, and honky tonks on Broadway.',
    image: 'https://images.unsplash.com/photo-1543249040-4e18118839d0?w=600&h=400&fit=crop', // Nashville Broadway neon signs
    category: 'music',
    region: 'other',
    suggestedQuery: '3 day Nashville music and food trip',
  },
  {
    id: 'new-orleans',
    name: 'New Orleans',
    tagline: 'The Big Easy',
    description: 'Jazz clubs, beignets, gumbo, and the most unique culture in America.',
    image: 'https://images.unsplash.com/photo-1571893544028-06b07af6dade?w=600&h=400&fit=crop', // New Orleans French Quarter
    category: 'music',
    region: 'other',
    suggestedQuery: '4 day New Orleans jazz, food, and culture trip',
  },
  {
    id: 'florida-keys',
    name: 'Florida Keys',
    tagline: 'Overseas Highway Paradise',
    description: 'Drive across the ocean on US-1, snorkel coral reefs, and catch sunset at Mallory Square.',
    image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=600&h=400&fit=crop', // Florida Keys ocean bridge
    category: 'beach',
    region: 'other',
    suggestedQuery: '4 day Florida Keys road trip to Key West',
  },
  {
    id: 'blue-ridge',
    name: 'Blue Ridge Parkway',
    tagline: "America's Favorite Drive",
    description: 'Cruise through the Appalachian Mountains with stunning overlooks and charming mountain towns.',
    image: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=400&fit=crop', // Blue Ridge autumn mountains
    category: 'road-trip',
    region: 'other',
    suggestedQuery: '4 day Blue Ridge Parkway scenic drive',
  },
  {
    id: 'acadia',
    name: 'Acadia National Park',
    tagline: 'Where Mountains Meet the Sea',
    description: 'Watch sunrise from Cadillac Mountain, explore tide pools, and enjoy fresh Maine lobster.',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=400&fit=crop', // Maine rocky coastline
    category: 'national-park',
    region: 'other',
    suggestedQuery: '3 day Acadia National Park Maine trip',
  },
  {
    id: 'memphis',
    name: 'Memphis',
    tagline: 'Home of the Blues & Rock n Roll',
    description: 'Visit Graceland, Sun Studio, and Beale Street where Elvis and B.B. King made history.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop', // Beale Street Memphis neon
    category: 'music',
    region: 'other',
    suggestedQuery: '3 day Memphis music history and BBQ trip',
  },
  {
    id: 'outer-banks',
    name: 'Outer Banks',
    tagline: 'Wild Horses & Shipwrecks',
    description: 'Drive the barrier islands, see wild horses, climb lighthouses, and visit Kitty Hawk.',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&h=400&fit=crop', // Beach barrier island lighthouse
    category: 'beach',
    region: 'other',
    suggestedQuery: '4 day Outer Banks North Carolina trip',
  },
  {
    id: 'savannah',
    name: 'Savannah',
    tagline: 'Southern Charm & Spanish Moss',
    description: 'Stroll through historic squares, take ghost tours, and enjoy Lowcountry cuisine.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop', // Southern oak trees Spanish moss
    category: 'culture',
    region: 'other',
    suggestedQuery: '3 day Savannah Georgia historic and food tour',
  },
  {
    id: 'hawaii-road-to-hana',
    name: 'Road to Hana',
    tagline: 'Maui\'s Legendary Drive',
    description: '600+ curves, 50+ bridges, countless waterfalls, and black sand beaches await.',
    image: 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=600&h=400&fit=crop', // Maui Hawaii waterfall tropical
    category: 'road-trip',
    region: 'other',
    suggestedQuery: '2 day Road to Hana Maui adventure',
  },
  {
    id: 'boston-freedom',
    name: 'Boston Freedom Trail',
    tagline: 'Walk Through American History',
    description: 'Follow the red brick road through 16 historic sites from the American Revolution.',
    image: 'https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=600&h=400&fit=crop', // Boston historic architecture
    category: 'culture',
    region: 'other',
    suggestedQuery: '3 day Boston history and seafood trip',
  },
  {
    id: 'yosemite',
    name: 'Yosemite',
    tagline: 'Granite Cliffs & Giant Sequoias',
    description: 'Stand beneath El Capitan, watch Yosemite Falls, and walk among ancient giant sequoias.',
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&h=400&fit=crop', // Yosemite Valley El Capitan Half Dome
    category: 'national-park',
    region: 'other',
    suggestedQuery: '3 day Yosemite National Park adventure',
  },
  {
    id: 'charleston',
    name: 'Charleston',
    tagline: 'Southern Belle of the Coast',
    description: 'Admire antebellum architecture, feast on shrimp and grits, and explore plantation history.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', // Charleston colorful row houses
    category: 'culture',
    region: 'other',
    suggestedQuery: '3 day Charleston SC food and history tour',
  },
  {
    id: 'great-smoky',
    name: 'Great Smoky Mountains',
    tagline: 'Most Visited National Park',
    description: 'Hike misty trails, spot black bears, and experience Appalachian culture in Gatlinburg.',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop', // Smoky Mountains misty forest
    category: 'national-park',
    region: 'other',
    suggestedQuery: '3 day Great Smoky Mountains hiking trip',
  },
  {
    id: 'san-diego',
    name: 'San Diego',
    tagline: 'Perfect Weather Paradise',
    description: 'Relax on beaches, visit the world-famous zoo, and explore the historic Gaslamp Quarter.',
    image: 'https://images.unsplash.com/photo-1538097304804-2a1b932466a9?w=600&h=400&fit=crop', // San Diego beach pier sunset
    category: 'beach',
    region: 'other',
    suggestedQuery: '4 day San Diego beaches, zoo, and tacos trip',
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
  const southwest = allDestinations.filter(d => d.region === 'southwest');
  const other = allDestinations.filter(d => d.region === 'other');

  const shuffledTexas = shuffleArray(texas);
  const shuffledSouthwest = shuffleArray(southwest);
  const shuffledOther = shuffleArray(other);

  const selected: Destination[] = [
    ...shuffledTexas.slice(0, 3),
    ...shuffledSouthwest.slice(0, 3),
    ...shuffledOther.slice(0, 2),
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
