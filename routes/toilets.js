import express from 'express';
import NodeCache from 'node-cache';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

const router = express.Router();

const BRUSSELS_API_URL = 'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/toilettes_publiques_vbx/records?limit=100';

// Cache pentru 5 minute
const cache = new NodeCache({ stdTTL: 300 });

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute
    max: 100 // limită de 100 request-uri per IP
});

router.use(limiter);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Funcție pentru fetch cu cache
const fetchToiletsData = async () => {
    const cacheKey = 'brussels_toilets';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        return cachedData;
    }

    const response = await fetch(BRUSSELS_API_URL);
    const data = await response.json();
    console.log('Raw API response:', data);
    cache.set(cacheKey, data);
    return data;
};

// Funcție pentru verificarea dacă toaleta este deschisă la momentul curent
const isToiletOpen = (openingHours) => {
    if (!openingHours || openingHours === '?') return false;
    if (openingHours === '24/24') return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Mapare zile pentru diferite formate
    const dayMap = {
        1: ['Lu', 'Ma', 'Monday'],
        2: ['Ma', 'Di', 'Tuesday'],
        3: ['Me', 'Wo', 'Wednesday'],
        4: ['Je', 'Do', 'Thursday'],
        5: ['Ve', 'Vr', 'Friday'],
        6: ['Sa', 'Za', 'Saturday'],
        0: ['Di', 'Zo', 'Sunday']
    };

    try {
        // Handle different time formats
        if (openingHours.includes('-')) {
            const [start, end] = openingHours.split('-').map(time => {
                return parseInt(time.trim().split(':')[0]);
            });
            return currentHour >= start && currentHour < end;
        }

        // Handle complex formats like "Lu-ve/Ma-vr 10:00-18:00, WE 10:00-20:00"
        const segments = openingHours.split(',');
        for (const segment of segments) {
            if (segment.includes(dayMap[currentDay][0]) || 
                segment.includes(dayMap[currentDay][1]) || 
                segment.includes(dayMap[currentDay][2])) {
                const timeRange = segment.match(/\d{1,2}:\d{2}/g);
                if (timeRange && timeRange.length >= 2) {
                    const start = parseInt(timeRange[0].split(':')[0]);
                    const end = parseInt(timeRange[1].split(':')[0]);
                    return currentHour >= start && currentHour < end;
                }
            }
        }
    } catch (error) {
        console.error('Error parsing opening hours:', openingHours);
        return false;
    }

    return false;
};

// Funcție pentru calculul distanței între două puncte (folosind formula Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raza Pământului în km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distanța în km
};

// Funcție pentru estimarea timpului de călătorie (presupunem viteza medie de mers pe jos 5 km/h)
const estimateTravelTime = (distance) => {
    const walkingSpeedKmH = 5;
    return (distance / walkingSpeedKmH) * 60; // Timpul în minute
};

// Funcție pentru verificarea dacă toaleta va fi încă deschisă când ajunge utilizatorul
const willBeOpenOnArrival = (openingHours, travelTimeMinutes) => {
    if (!openingHours || openingHours === '?') return false;
    if (openingHours === '24/24') return true;

    const now = new Date();
    const arrivalTime = new Date(now.getTime() + travelTimeMinutes * 60000);
    const arrivalHour = arrivalTime.getHours();
    const arrivalDay = arrivalTime.getDay();

    const dayMap = {
        1: ['Lu', 'Ma', 'Monday'],
        2: ['Ma', 'Di', 'Tuesday'],
        3: ['Me', 'Wo', 'Wednesday'],
        4: ['Je', 'Do', 'Thursday'],
        5: ['Ve', 'Vr', 'Friday'],
        6: ['Sa', 'Za', 'Saturday'],
        0: ['Di', 'Zo', 'Sunday']
    };

    try {
        if (openingHours.includes('-')) {
            const [start, end] = openingHours.split('-').map(time => {
                return parseInt(time.trim().split(':')[0]);
            });
            return arrivalHour >= start && arrivalHour < end;
        }

        const segments = openingHours.split(',');
        for (const segment of segments) {
            if (segment.includes(dayMap[arrivalDay][0]) || 
                segment.includes(dayMap[arrivalDay][1]) || 
                segment.includes(dayMap[arrivalDay][2])) {
                const timeRange = segment.match(/\d{1,2}:\d{2}/g);
                if (timeRange && timeRange.length >= 2) {
                    const start = parseInt(timeRange[0].split(':')[0]);
                    const end = parseInt(timeRange[1].split(':')[0]);
                    return arrivalHour >= start && arrivalHour < end;
                }
            }
        }
    } catch (error) {
        console.error('Error parsing opening hours for arrival time:', openingHours);
        return false;
    }

    return false;
};

const validateCoordinates = (lat, lng) => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    return !isNaN(latNum) && 
           !isNaN(lngNum) && 
           latNum >= -90 && 
           latNum <= 90 && 
           lngNum >= -180 && 
           lngNum <= 180;
};

/**
 * @api {get} /api/toilets Get Toilets
 * @apiName GetToilets
 * @apiGroup Toilets
 *
 * @apiParam {Boolean} [openNow] Filter only currently open toilets
 * @apiParam {Number} [userLat] User's latitude
 * @apiParam {Number} [userLng] User's longitude
 *
 * @apiSuccess {Number} total Total number of toilets
 * @apiSuccess {Array} toilets List of toilets
 * @apiSuccess {String} timestamp Server timestamp
 */
router.get('/', async (req, res) => {
    logger.info('Toilet request received', { 
        query: req.query,
        timestamp: new Date().toISOString()
    });
    try {
        const { 
            userLat, 
            userLng, 
            openNow, 
            accessibility,
            pricing
        } = req.query;
        
        // Validare coordonate
        if ((userLat || userLng) && !validateCoordinates(userLat, userLng)) {
            return res.status(400).json({
                error: "Invalid coordinates",
                message: "Please provide valid latitude and longitude values"
            });
        }

        let data = await fetchToiletsData();
        
        // Verificăm dacă avem date valide
        if (!data || !data.results || !Array.isArray(data.results)) {
            return res.status(500).json({
                error: "Invalid data format",
                message: "Could not retrieve toilet data in the expected format"
            });
        }

        let toilets = data.results.map(toilet => {
            const toiletLat = toilet.geo_point_2d.lat;
            const toiletLng = toilet.geo_point_2d.lon;
            
            // Calculăm distanța și timpul de călătorie doar dacă avem poziția utilizatorului
            let distance = null;
            let estimatedTravelTime = null;
            let willBeOpen = true;

            if (userLat && userLng) {
                distance = calculateDistance(
                    parseFloat(userLat), 
                    parseFloat(userLng), 
                    toiletLat, 
                    toiletLng
                );
                estimatedTravelTime = estimateTravelTime(distance);
                willBeOpen = willBeOpenOnArrival(toilet.openinghours, estimatedTravelTime);
            }

            const isOpen = isToiletOpen(toilet.openinghours);
            
            return {
                id: toilet.objectid,
                location: {
                    name: toilet.location || 'Unknown location',
                    address: {
                        postalCode: toilet.postalcode,
                        municipality: toilet.municipality_en || toilet.municipality_fr,
                        territory: toilet.territory_en || toilet.territory_fr
                    }
                },
                coordinates: {
                    lat: toilet.geo_point_2d.lat,
                    lng: toilet.geo_point_2d.lon
                },
                details: {
                    accessibility: toilet.pmr_en,
                    pricing: toilet.pricing_en,
                    category: toilet.category_en,
                    status: toilet.status
                },
                schedule: {
                    openingHours: toilet.openinghours,
                    isAlwaysOpen: toilet.openinghours === '24/24',
                    isCurrentlyOpen: isOpen,
                    willBeOpenOnArrival: willBeOpen
                },
                distance: {
                    kilometers: distance ? distance.toFixed(2) : null,
                    estimatedWalkingTime: estimatedTravelTime ? Math.round(estimatedTravelTime) : null
                },
                links: {
                    googleMaps: toilet.google_maps,
                    streetView: toilet.google_street_view
                },
                management: {
                    type: toilet.management_en,
                    isPrivate: toilet.management_en === 'Private'
                }
            };
        });

        // Filtrare pentru toalete deschise și accesibile
        if (openNow === 'true') {
            toilets = toilets.filter(toilet => 
                toilet.schedule.isCurrentlyOpen && 
                toilet.schedule.willBeOpenOnArrival
            );
        }

        // Opțional: sortare după distanță dacă avem poziția utilizatorului
        if (userLat && userLng) {
            toilets.sort((a, b) => 
                (a.distance.kilometers || Infinity) - (b.distance.kilometers || Infinity)
            );
        }

        // Filtrare pentru PRM
        if (accessibility === "PRM") {
            toilets = toilets.filter(
                toilet => toilet.details.accessibility === "PRM"
            );
        }

        // Adăugăm filtrarea pentru pricing
        if (pricing === "Free") {
            toilets = toilets.filter(
                toilet => toilet.details.pricing === "Free"
            );
        }

        const response_data = {
            total: toilets.length,
            toilets: toilets,
            timestamp: new Date().toISOString()
        };

        res.json(response_data);
    } catch (error) {
        console.error('Error fetching toilets:', error);
        
        if (error.name === 'FetchError') {
            return res.status(503).json({
                error: "Service Unavailable",
                message: "Could not fetch data from Brussels API"
            });
        }
        
        res.status(500).json({ 
            error: "Internal server error",
            message: "An unexpected error occurred"
        });
    }
});

export default router; 