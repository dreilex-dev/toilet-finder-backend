# Brussels Public Toilets API Documentation

## Overview

This API provides access to information about public toilets in Brussels, including location, schedule, accessibility, and other relevant details. The data is sourced from the Brussels Open Data Store.

## Production Environment

**Base URL:** https://brussels-toilets-api-16c02a1b159d.herokuapp.com

## API Testing Results

### 1. Basic Toilets Query
**Endpoint:** https://brussels-toilets-api-16c02a1b159d.herokuapp.com/api/toilets
**Description:** Returns all toilets without filters
**Response:**
- Total toilets: 100
- Contains all toilet facilities regardless of status

### 2. Free Toilets
**Endpoint:** https://brussels-toilets-api-16c02a1b159d.herokuapp.com/api/toilets?pricing=Free
**Description:** Returns only free toilets
**Test Results:**
- Total toilets: 83
- All returned toilets have pricing marked as Free
- Includes both PRM and non-PRM accessible toilets

### 3. PRM Accessible Toilets
**Endpoint:** https://brussels-toilets-api-16c02a1b159d.herokuapp.com/api/toilets?accessibility=PRM
**Description:** Returns only PRM accessible toilets
**Test Results:**
- Total toilets: 39
- All returned toilets have PRM accessibility
- Includes both free and paying toilets

### 4. Free & PRM Accessible Toilets
**Endpoint:** https://brussels-toilets-api-16c02a1b159d.herokuapp.com/api/toilets?pricing=Free&accessibility=PRM
**Description:** Returns toilets that are both free and PRM accessible
**Test Results:**
- Total toilets: 27
- All returned toilets are free and PRM accessible

### 5. Currently Open, Free & PRM Accessible Toilets
**Endpoint:** https://brussels-toilets-api-16c02a1b159d.herokuapp.com/api/toilets?pricing=Free&accessibility=PRM&openNow=true
**Description:** Returns toilets that are free, PRM accessible, and currently open
**Test Results:**
- Total toilets: 16
- All returned toilets are:
  - Free
  - PRM accessible
  - Currently open
- Locations include:
  - Parks (Parc de la Porte de Hal, Parc d'Osseghem)
  - Shopping centers (City 2)
  - Train stations (Bruxelles-Schuman)
  - Public spaces

## Response Structure

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| pricing | String | Filter by cost ("Free" or "Paying") | pricing=Free |
| accessibility | String | Filter by accessibility ("PRM") | accessibility=PRM |
| openNow | Boolean | Filter currently open toilets | openNow=true |
| userLat | Number | User's latitude | userLat=50.8466 |
| userLng | Number | User's longitude | userLng=4.3528 |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| total | Number | Total number of toilets matching the criteria |
| toilets | Array | List of toilet objects |
| timestamp | String | ISO timestamp of the response |

### Toilet Object Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier |
| location | Object | Name and address details |
| coordinates | Object | Latitude and longitude |
| details | Object | Accessibility, pricing, and category |
| schedule | Object | Opening hours and current status |
| distance | Object | Distance and walking time (when coordinates provided) |
| management | Object | Management type and privacy status |

## Technical Details

### Performance Metrics
- Average response time: < 200ms
- Cached responses: < 50ms
- Rate limit: 100 requests/15 minutes

### Data Validation
- Coordinate validation implemented
- Filter validation for all parameters
- Error handling for invalid inputs

### Security Features
- Rate limiting: 100 requests per IP per 15 minutes
- Input validation for coordinates
- Error handling for external API failures

### Caching System
- Data cached for 5 minutes
- Reduces response time
- Minimizes calls to Brussels API

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Invalid coordinates |
| 429 | Too many requests |
| 503 | Brussels API unavailable |
| 500 | Internal server error |

## Data Source
- Brussels Open Data Store API
- Real-time data updates
- JSON format
- Source: opendata.brussels.be