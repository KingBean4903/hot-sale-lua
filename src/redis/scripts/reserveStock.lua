-- KEYS[1] = stock key
-- KEYS[2] = reservations zset
-- ARGV[1] = quantity
-- ARGV[2] = reservationId
-- ARGV[3] = expiresAt

local available = tonumber(redis.call("HGET", KEYS[1], "available"))

if available < tonumber(ARGV[1]) then
  return 0
end

redis.call("HINCRBY", KEYS[1], "available", -ARGV[1])
redis.call("HINCRBY", KEYS[1], "reserved", ARGV[1])
redis.call("ZADD", KEYS[2], ARGV[3], ARGV[2])

return 1
