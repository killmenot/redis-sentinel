const express = require('express')
const { Redis } = require('ioredis')

/**
 * @link https://medium.com/@mohsenmahoski/setting-up-sentinel-with-docker-compose-5cad962c7643
 */

const app = express();

let redisClient = null;

const checkRedis = async () => {
  try {
    if (redisClient.status === 'ready') {
      const result = await redisClient.set("ping", "pong", 'EX', 14 * 60);
      console.log('result is', result);
    } else {
      console.log('Redis client is not ready');
    }
  } catch (error) {
    console.log('REDIS ERROR', error);
  }
};

const initRedisClient = async () => {
  if (redisClient) return;
  try {
    redisClient = new Redis({
      sentinels: [
        { host: process.env.HOST_IP, port: 26379 },
        { host: process.env.HOST_IP, port: 26380 },
        { host: process.env.HOST_IP, port: 26381 }
      ],
      name: 'mymaster',
      sentinelRetryStrategy: (times) => Math.min(times * 1000, 60000),
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }

        return false
      },
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    redisClient.on('ready', async () => {
      try {
        console.log('Redis is ready');
        await checkRedis();
      } catch (error) {
        console.log(error);
      }
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting');
    });

    redisClient.on('error', (err) => {
      console.log(err);
    });

  } catch (error) {
    console.log(error);
    redisClient = null;
  }
};

const start = () => {
  app.listen(5001, '0.0.0.0', async function () {
    console.log('APP STARTED ON PORT 5001');
    await initRedisClient();
  });
};

start();