const http = require('http');

const loginData = JSON.stringify({
    email: 'customer2@dealflow360.com',
    password: 'password123'
});

const loginReq = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(body);
        if (!parsed.token) {
            console.error('Failed to login:', parsed);
            return;
        }
        const { token } = parsed;
        console.log('Got token');
        
        const qId = '6a9c6274b645e8fef3a0b72e'; // QT-0024

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: `/api/portal/quotations/${qId}/confirm`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (res2) => {
            console.log('Status:', res2.statusCode);
            let body2 = '';
            res2.on('data', chunk => body2 += chunk);
            res2.on('end', () => {
                console.log('Response:', body2);
            });
        });
        req.end();
    });
});
loginReq.write(loginData);
loginReq.end();
