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
        'Content-Length': loginData.length
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const { token } = JSON.parse(body);
        
        const dashReq = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/portal/dashboard',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (dRes) => {
            let dBody = '';
            dRes.on('data', chunk => dBody += chunk);
            dRes.on('end', () => {
                console.log('Dashboard response:', JSON.stringify(JSON.parse(dBody), null, 2));
            });
        });
        dashReq.end();
    });
});
loginReq.write(loginData);
loginReq.end();
