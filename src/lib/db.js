import { Pool } from 'pg';

let pool = null;

export function getDbPool() {
	if (!pool) {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL is not set');
		}
		pool = new Pool({ connectionString });
	}
	return pool;
}

export async function withTransaction(callback) {
	const client = await getDbPool().connect();
	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (err) {
		try { await client.query('ROLLBACK'); } catch (_) {}
		throw err;
	} finally {
		client.release();
	}
}