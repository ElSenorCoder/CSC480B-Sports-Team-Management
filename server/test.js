const http = require('http');

// ==========================================
// LOGIN
// ==========================================

function login() {
    return new Promise((resolve, reject) => {

        const data = JSON.stringify({
            identifier: 'player_alex',
            password: 'mypassword'
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
                console.log('\n========== LOGIN ==========');
                console.log('Status:', res.statusCode);
                console.log('Response:', body);

                if (res.statusCode !== 200) {
                    return reject(
                        new Error(`Login failed: ${res.statusCode}`)
                    );
                }

                // Get session cookie
                const cookies = res.headers['set-cookie'];

                if (!cookies || cookies.length === 0) {
                    return reject(
                        new Error('No session cookie received')
                    );
                }

                // Find sessionToken cookie
                const sessionCookie = cookies.find(cookie =>
                    cookie.startsWith('sessionToken=')
                );

                if (!sessionCookie) {
                    return reject(
                        new Error('sessionToken cookie not found')
                    );
                }

                // Only send the name=value part
                const cookie = sessionCookie.split(';')[0];

                console.log('Session cookie:', cookie);

                resolve(cookie);
            });
        });

        req.on('error', reject);

        req.write(data);
        req.end();
    });
}


// ==========================================
// GET CURRENT USER
// ==========================================

function getCurrentUser(cookie) {
    return new Promise((resolve, reject) => {

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/user/me',
            method: 'POST',
            headers: {
                'Cookie': cookie
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                console.log('\n========== USER / ME ==========');
                console.log('Status:', res.statusCode);

                try {
                    const result = JSON.parse(body);

                    console.log(
                        'Result from /api/user/me:'
                    );

                    console.log(
                        JSON.stringify(result, null, 2)
                    );

                    resolve(result);

                } catch (error) {
                    console.log('Response:', body);
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        req.end();
    });
}

// ==========================================
// GET THE USER'S TEAMS
// ==========================================
function getMyTeam(cookie) {
    return new Promise((resolve, reject) => {

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/teams/me',
            method: 'POST',
            headers: {
                'Cookie': cookie
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                console.log('\n========== USER / ME ==========');
                console.log('Status:', res.statusCode);

                try {
                    const result = JSON.parse(body);

                    console.log(
                        'Result from /api/teams/me:'
                    );

                    console.log(
                        JSON.stringify(result, null, 2)
                    );

                    resolve(result);

                } catch (error) {
                    console.log('Response:', body);
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        req.end();
    });
}

// ==========================================
// GET THE USER'S TEAMS GAMES
// ==========================================
function getMyTeamGame(cookie, team_id) {
    return new Promise((resolve, reject) => {

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api/teams/${team_id}/games`,
            method: 'POST',
            headers: {
                'Cookie': cookie
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                console.log('\n========== USER / ME ==========');
                console.log('Status:', res.statusCode);

                try {
                    const result = JSON.parse(body);

                    console.log(
                        `Result from /api/${team_id}/games:`
                    );

                    console.log(
                        JSON.stringify(result, null, 2)
                    );

                    resolve(result);

                } catch (error) {
                    console.log('Response:', body);
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        req.end();
    });
}


// ==========================================
// RUN TEST
// ==========================================

async function main() {
    try {

        // 1. Login
        const sessionCookie = await login();

        // 2. Call /user/me using session cookie
        await getMyTeamGame(sessionCookie, 2);

    } catch (error) {
        console.error('\nTEST FAILED:', error.message);
    }
}

main();
