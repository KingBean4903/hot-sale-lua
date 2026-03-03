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
const RESERVE_STOCK_LUA = fs.readFileSync(
`./src/redis/scripts/reserveStock.lua`,
								'utf8'
);
fastify.post('/init-stock', async (request, reply) => {
								
								await redis.hset('flashsale:fs_123:stock',
																								'available', 50,
																								'reserved', 0,
																								'sold', 0); 
});

fastify.post('/reserve', async (request, reply) => {

								/*const res = await reserveLua({
																saleId: 'fs_123',
																reservationId: 'res_8799',
																ttlMs: 10_000
								});*/

								const attempts = 100;

								const results = await Promise.all(
																Array.from({ length: attempts }, ( _, k) => 
																								reserveLua({ 
																																saleId: 'fs_123', 
																																reservationId: 'res_772A_1', 
																																ttlMs: 60_000,
																																custId: 'cust_343'
																								})
																))

								console.log(`Results ${results}`)

								const success = results.filter(r => r === 3).length;
								const failed = results.filter(r => r === 0).length;

								console.log('Success: ', success)
								console.log('Failed: ', failed)

								const stock  = await redis.hgetall(`flashsale:fs_123:stock`);
								console.log('Final stock', stock);

								return { success, failed, stock }
})

const releaseStockSha = await redis.script("LOAD", RELEASE_STOCK_LUA);
const releaseStockLuaSha = await redis.script("LOAD", RESERVE_STOCK_LUA);

const reserveLua = async({ saleId, reservationId, ttlMs, custId }) => {

								const expiresAt = Date.now() + ttlMs;
								const numkeys = 3;
								const quantity = '1';
								const MAX_PER_CUSTOMER = '2';
								
								try {
																const res = await redis.evalsha(
																								releaseStockLuaSha,
																								numkeys,
																								[`flashsale:${saleId}:stock`,
																								 `flashsale:${reservationId}:reservations`,
																								 `flashsale:${saleId}:cust:${custId}`
																								],
																								[
																								   quantity, 
																											reservationId, 
																											expiresAt,
																											MAX_PER_CUSTOMER
																]);

																																console.log(`Reserve res ${res}`)
								} catch(err) {

																if (err.message.includes('NOSCRIPT')) {
																								const releaseStockLuaSha = 
																																await redis.script("LOAD", RESERVE_STOCK_LUA);

																const res = await redis.evalsha(
																								releaseStockLuaSha,
																								numkeys,
																								[`flashsale:${saleId}:stock`,
																								 `flashsale:${reservationId}:reservations`,
																								 `flashsale:${saleId}:cust:${custId}`
																								],
																								[
																								   quantity, 
																											reservationId, 
																											expiresAt,
																											MAX_PER_CUSTOMER
																]);
																} else {
																								console.log(`Reserve log erri ${err}`)
																								throw err;
																}

								}

}

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
																await evalReleaseStock(`flashsale:${saleId}:stock`)
																await redis.zrem(
																								`flashsale:${reservatioId}:reservations`,
																								reservationId
																)
								}
}

const evalReleaseStock = async (keys) => {

								try { 
																await redis.evalsha(releaseStockSha, 1, keys, 1 );
								} catch(err) {
																if (err.message.includes('NOSCRIPT')) {
																								const releaseStockSha = 
																																await redis.script("LOAD", RELEASE_STOCK_LUA)
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
}, REAP_INTERVAL_MS) */


const start = async () => {
								try {
																await fastify.listen({ port: 8500 })
								} catch (err) {
																fastify.log.error(err)
																process.exit(1)
								}
}

start();
