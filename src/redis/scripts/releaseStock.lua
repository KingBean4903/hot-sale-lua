-- KEYS[1] = flashsale:{saleId}:stock
-- ARGV[1] = quantity

redis.call('HINCRBY', KEYS[1], 'available', ARGV[1])
redis.call('HINCRBY', KEYS[1], 'reserved', -ARGV[1])

return 1
