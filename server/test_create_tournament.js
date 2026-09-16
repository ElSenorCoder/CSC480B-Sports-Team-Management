const BASE_URL = 'http://localhost:3001/api/tournaments';

async function createTournament() {
    try {
        const response = await fetch(
            `${BASE_URL}/create`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',

                    // If requireAuth uses a cookie:
                    Cookie: process.env.AUTH_COOKIE || ''
                },
                body: JSON.stringify({
                    name: 'Test Tournament',
                    id: 1
                })
            }
        );

        const data = await response.json();

        console.log('\nCreate Tournament');
        console.log('=================');
        console.log('Status:', response.status);
        console.log(
            JSON.stringify(data, null, 2)
        );

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to create tournament'
            );
        }

        return data;

    } catch (error) {
        console.error(
            '\nError:',
            error.message
        );

        process.exit(1);
    }
}

createTournament();
