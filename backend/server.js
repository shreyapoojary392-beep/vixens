require('dotenv').config();
const Redis = require('ioredis');
const fastify = require('fastify')({ logger: true });

const PORT = process.env.PORT || 3000;
const redis = new Redis(process.env.REDIS_URL); // Connects to your Redis instance

// Enable CORS
fastify.register(require('@fastify/cors'), { origin: true });

// GET current stock
fastify.get('/stock', async () => {
    const stock = await redis.get('stock') || 100;
    return { productId: process.env.PRODUCT_ID, stock: parseInt(stock) };
});

// Reserve product
fastify.post('/reserve', async (request, reply) => {
    const { userId } = request.body || {};
    if (!userId) return reply.status(400).send({ status: "FAIL", message: "User ID required" });

    // 1. Check if user already purchased (using a Redis Set)
    const alreadyBought = await redis.sismember('buyers', userId);
    if (alreadyBought) return reply.status(400).send({ status: "FAIL", message: "Already purchased" });

    // 2. Atomic Decrement: Only proceed if stock > 0
    // LUA script ensures the check and decrement happen as one "atomic" operation
    const script = `
        local stock = tonumber(redis.call('get', KEYS[1]) or 0)
        if stock > 0 then
            redis.call('decr', KEYS[1])
            redis.call('sadd', KEYS[2], ARGV[1])
            return stock - 1
        else
            return -1
        end
    `;

    const remaining = await redis.eval(script, 2, 'stock', 'buyers', userId);

    if (remaining === -1) {
        return reply.status(410).send({ status: "FAIL", message: "Sold out" });
    }

    return reply.send({ status: "SUCCESS", remaining: remaining });
});

const start = async () => {
    // Initialize stock in Redis if it doesn't exist
    if (!(await redis.exists('stock'))) {
        await redis.set('stock', process.env.INITIAL_STOCK || 100);
    }
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${PORT}`);
};

start();