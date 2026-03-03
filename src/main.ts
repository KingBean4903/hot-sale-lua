import { Redis } from 'ioredis';
import fs from 'fs';
import Fastify from 'fastify';

const fastify = Fastify({
								logger: true
});


const redis_url = process.env.REDIS_URL as string;

const activeSales = ['fs_123']

const redis =  new Redis();

const REAP_INTERVAL_MS = 1000;

const RELEASE_STOCK_LUA = fs.readFileSync(
`./src/redis/scripts/releaseStock.lua`,
								'utf8'
);

fastify.post('/init-stock', async (request, reply) => {
								
								await redis.hset('flashsale:fs_123:stock',
																								'available', 3,
																								'reserved', 0,
																								'sold', 0); 
});

fastify.post('/reserve', async (request, reply) => {

								await addReservation({
																saleId: 'fs_123',
																reservationId: 'res_8799',
																ttlMs: 10_000
								});
})

const releaseStockSha = await redis.script("LOAD", RELEASE_STOCK_LUA);

const addReservation = async({ saleId, reservationId, ttlMs }) => {
								const expiresAt = Date.now() + ttlMs;
								
								const val1 = await redis.zadd(
																`flashsale:${saleId}:reservations`,
																expiresAt, reservationId);

								console.log(`Flashsale response ${val1}`);
}


const reapExpired = async (saleId) => {

								const now = Date.now();

								const expired = await redis.zrangebyscore(
																`flashsale:${saleId}:reservations`,
																0,
																now
								)

								for (const reservationId of expired) {
																await evalReleaseStock(`${saleId}`)
																await redis.zrem(
																								`flashsale:${saleId}:reservations`,
																								reservationId
																)
								}
}

const evalReleaseStock = async (keys) => {

								try { 
																await redis.evalsha(releaseStockSha, 1, keys, 1 );
								} catch(err) {
																if (err.message.includes('NOSCRIPT')) {
																								const releaseStockSha = await redis.script("LOAD", RELEASE_STOCK_LUA)
																								await redis.evalsha(releaseStockSha, 1, keys, 1 );
																} else {
																								throw err
																}
								}
}

/* setInterval(async () => {

								for(const saleId of activeSales) {
																await reapExpired(saleId);
								}
}, REAP_INTERVAL_MS)
*/

const start = async () => {
								try {
																await fastify.listen({ port: 6500 })
								} catch (err) {
																fastify.log.error(err)
																process.exit(1)
								}
}

start();
