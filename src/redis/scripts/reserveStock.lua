-- KEYS[1] = stock key
-- KEYS[2] = reservations zset
-- ARGV[1] = quantity
-- ARGV[2] = reservationId
-- ARGV[3] = expiresAt



local added = redis.call("ZADD", KEYS[2], "NX", ARGV[3], ARGV[2])

if added == 0 then
								return 3
end

local available = tonumber(redis.call("HGET", KEYS[1], "available"))

if available < tonumber(ARGV[1]) then
  return 0
end

local customerReserved = tonumber(redis.call("HGET", KEYS[3]) or "0")
if (customerReserved + tonumber(ARGV[1])) > tonumber(ARGV[4]) then
								redis.call("ZREM", KEYS[2], ARGV[2])
								return 2
end

redis.call("HINCRBY", KEYS[1], "available", -ARGV[1])
redis.call("HINCRBY", KEYS[1], "reserved", ARGV[1])
redis.call("INCRBY", KEYS[3], ARGV[1])

return 1
