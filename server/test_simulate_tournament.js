const BASE_URL = 'http://localhost:3001/api/tournaments';

async function simulateTournament() {
    const tournamentId = 1;

    try {
        const response = await fetch(
            `${BASE_URL}/${tournamentId}/simulation`,
            {
                method: 'GET',
                headers: {
                    Cookie: process.env.AUTH_COOKIE || ''
                }
            }
        );

        const data = await response.json();

        console.log('\nTournament Simulation');
        console.log('=====================');
        console.log('Tournament ID:', tournamentId);
        console.log('Status:', response.status);
        console.log(
            JSON.stringify(data, null, 2)
        );

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to simulate tournament'
            );
        }

    } catch (error) {
        console.error(
            '\nError:',
            error.message
        );

        process.exit(1);
    }
}

simulateTournament();
