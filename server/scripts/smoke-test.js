require('dotenv').config();

const http = require('http');
const assert = require('assert/strict');

const app = require('../src/app');

const listen = () => new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
});

const request = (server, options = {}, body) => new Promise((resolve, reject) => {
    const address = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
        hostname: '127.0.0.1',
        port: address.port,
        path: options.path || '/',
        method: options.method || 'GET',
        headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(options.headers || {})
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            const contentType = res.headers['content-type'] || '';
            const parsed = contentType.includes('application/json') && data ? JSON.parse(data) : data;
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
});

const run = async () => {
    const server = await listen();

    try {
        const home = await request(server);
        assert.equal(home.status, 200);
        assert.equal(home.headers['x-content-type-options'], 'nosniff');
        assert.equal(home.headers['x-frame-options'], 'DENY');

        const protectedRoute = await request(server, { path: '/api/measurements' });
        assert.equal(protectedRoute.status, 401);

        const invalidLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, {});
        assert.equal(invalidLogin.status, 400);

        const invalidImage = await request(
            server,
            { path: '/api/measurements/photo/analyze', method: 'POST', headers: { Authorization: 'Bearer invalid' } },
            { imageData: 'not-an-image' }
        );
        assert.equal(invalidImage.status, 400);

        const username = `smoke_${Date.now()}`;
        const password = 'secret123';

        const register = await request(server, { path: '/api/auth/register', method: 'POST' }, {
            username,
            first_name: 'Smoke',
            last_name: 'Test',
            password
        });
        assert.equal(register.status, 201);

        const login = await request(server, { path: '/api/auth/login', method: 'POST' }, { username, password });
        assert.equal(login.status, 200);
        assert.ok(login.body.token);

        const authHeaders = { Authorization: `Bearer ${login.body.token}` };
        const measurement = {
            glucose_value: 110,
            date: '2026-05-05',
            time: '09:30',
            unit: 'mg/dL',
            context: 'Ayunas',
            notes: 'Smoke test'
        };

        const created = await request(
            server,
            { path: '/api/measurements', method: 'POST', headers: authHeaders },
            measurement
        );
        assert.equal(created.status, 201);
        assert.equal(created.body.measurement.glucose_value, 110);

        const history = await request(server, { path: '/api/measurements', headers: authHeaders });
        assert.equal(history.status, 200);
        assert.ok(history.body.some((item) => item.id === created.body.measurement.id));

        const updated = await request(
            server,
            { path: `/api/measurements/${created.body.measurement.id}`, method: 'PUT', headers: authHeaders },
            { ...measurement, glucose_value: 115, notes: 'Updated smoke test' }
        );
        assert.equal(updated.status, 200);
        assert.equal(updated.body.measurement.glucose_value, 115);

        const deleted = await request(
            server,
            { path: `/api/measurements/${created.body.measurement.id}`, method: 'DELETE', headers: authHeaders }
        );
        assert.equal(deleted.status, 200);

        console.log('Smoke tests passed');
    } finally {
        server.close();
    }
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
