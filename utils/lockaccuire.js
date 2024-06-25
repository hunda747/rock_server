
const acquireLockWithTimeout = async (mutex, timeout) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout while acquiring lock'));
    }, timeout);

    mutex.acquire().then((release) => {
      clearTimeout(timer);
      resolve(release);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

module.exports = { acquireLockWithTimeout }