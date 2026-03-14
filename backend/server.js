require('dotenv').config();

const fastify = require('fastify')({ logger: true });

const PORT = process.env.PORT || 3000;
const PRODUCT_ID = process.env.PRODUCT_ID || "product_1";

/* In-memory stock */
let stock = 10;

/* Track buyers to prevent duplicates */
const buyers = new Set();

/* Enable CORS */
fastify.register(require('@fastify/cors'), {
  origin: true
});


/* GET current stock */
fastify.get('/stock', async () => {
  return {
    productId: PRODUCT_ID,
    stock: stock
  };
});


/* Reserve product */
fastify.post('/reserve', async (request, reply) => {

  const { userId } = request.body || {};

  if (!userId) {
    return reply.status(400).send({
      status: "FAIL",
      message: "User ID required"
    });
  }

  /* Prevent duplicate purchase */
  if (buyers.has(userId)) {
    return reply.status(400).send({
      status: "FAIL",
      message: "Already purchased"
    });
  }

  /* Check stock */
  if (stock <= 0) {
    return reply.status(410).send({
      status: "FAIL",
      message: "Sold out"
    });
  }

  /* Reserve item */
  buyers.add(userId);
  stock--;

  return reply.send({
    status: "SUCCESS",
    remaining: stock
  });

});


/* Start server */
const start = async () => {
  try {
    await fastify.listen({
      port: PORT,
      host: '0.0.0.0'
    });

    console.log(`🚀 Server running on port ${PORT}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();