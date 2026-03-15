const { join } = require('path');

/**
 * Puppeteer descarga Chrome en .cache/puppeteer dentro del proyecto.
 * Esto asegura que el binario esté disponible tanto en build como en runtime de Render.
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
