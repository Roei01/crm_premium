import request from 'supertest';
import app from '../src/app';

describe('App Endpoints', () => {
  it('GET /health should return 200 and service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'auth-service' });
  });
});

