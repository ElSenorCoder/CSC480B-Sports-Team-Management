const http = require('http');

const identifier = 'admin_user';
const password = 'mypassword';

const data = JSON.stringify({
    identifier,
    password
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);

        console.log('\nCookies received:');

        const cookies = res.headers['set-cookie'];

        if (cookies) {
            cookies.forEach(cookie => {
                console.log(cookie);
            });
        } else {
            console.log('No cookies received.');
        }
    });
});

req.on('error', (error) => {
    console.error('Request failed:', error.message);
});

req.write(data);
req.end();