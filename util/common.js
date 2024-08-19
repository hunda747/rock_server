const { redlock } = require("./redis");

const acquireLockWithTimeoutRedis = async (resource, ttl, timeout) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout while acquiring lock'));
    }, timeout);

    redlock.lock(resource, ttl).then((lock) => {
      clearTimeout(timer);
      resolve(lock);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

const releaseLock = async (lock) => {
  console.log("in release");
  try {
    if (lock) {
      await lock.unlock();
    }
  } catch (unlockError) {
    console.log(`Failed to release lock:,`, unlockError);
  }
  // catch (err) {
  //   console.log('lock erro', err);
  // }
}

module.exports = { acquireLockWithTimeoutRedis, releaseLock }