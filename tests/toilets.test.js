import request from 'supertest';
import { expect } from 'chai';
import app from '../index.js';

describe('Toilets API', () => {
    it('should return all toilets', async () => {
        const res = await request(app)
            .get('/api/toilets')
            .expect(200);
            
        expect(res.body).to.have.property('total');
        expect(res.body).to.have.property('toilets');
        expect(res.body.toilets).to.be.an('array');
    });

    it('should validate coordinates', async () => {
        const res = await request(app)
            .get('/api/toilets?userLat=invalid&userLng=4.3517')
            .expect(400);
            
        expect(res.body).to.have.property('error');
    });

    it('should calculate distances when coordinates provided', async () => {
        const res = await request(app)
            .get('/api/toilets?userLat=50.8503&userLng=4.3517')
            .expect(200);
            
        expect(res.body.toilets[0]).to.have.nested.property('distance.kilometers');
        expect(res.body.toilets[0]).to.have.nested.property('distance.estimatedWalkingTime');
    });

    it('should filter open toilets', async () => {
        const res = await request(app)
            .get('/api/toilets?openNow=true')
            .expect(200);
            
        expect(res.body.toilets.every(t => t.schedule.isCurrentlyOpen)).to.be.true;
    });
}); 