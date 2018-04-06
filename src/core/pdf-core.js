const puppeteer = require('puppeteer');
const _ = require('lodash');
const config = require('../config');
const logger = require('../util/logger')(__filename);
const genericPool = require('generic-pool');

// The puppeteer launch causes many events to be emitted.
process.setMaxListeners(0);

const poolFactory = {
  create() {
    logger.info('Adding new browser to pool');
    return puppeteer.launch({
      headless: !config.DEBUG_MODE,
      ignoreHTTPSErrors: false,
      args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
      sloMo: config.DEBUG_MODE ? 250 : undefined,
    });
  },
  destroy(client) {
    logger.info('Destroying browser from pool');
    return client.close();
  },
};
const poolOpts = {
  max: 15,
  min: 4,
};
const myPool = genericPool.createPool(poolFactory, poolOpts);

async function render(_opts = {}) {
  const opts = _.merge({
    cookies: [],
    scrollPage: false,
    emulateScreenMedia: true,
    ignoreHttpsErrors: false,
    html: null,
    viewport: {
      width: 1600,
      height: 1200,
    },
    goto: {
      waitUntil: 'networkidle0',
      timeout: 2000,
    },
    pdf: {
      format: 'A4',
      printBackground: true,
    },
  }, _opts);

  if (_.get(_opts, 'pdf.width') && _.get(_opts, 'pdf.height')) {
    // pdf.format always overrides width and height, so we must delete it
    // when user explicitly wants to set width and height
    opts.pdf.format = undefined;
  }

  logOpts(opts);

  const browser = await myPool.acquire();
  const page = await browser.newPage();

  page.on('console', (...args) => logger.info('PAGE LOG:', ...args));

  page.on('error', (err) => {
    logger.error(`Error event emitted: ${err}`);
    logger.error(err.stack);
  });

  let data;
  try {
    await page.setViewport(opts.viewport);
    if (opts.emulateScreenMedia) {
      await page.emulateMedia('screen');
    }

    opts.cookies.map(async (cookie) => {
      await page.setCookie(cookie);
    });

    if (opts.html) {
      // https://github.com/GoogleChrome/puppeteer/issues/728
      await page.goto(`data:text/html,${opts.html}`, opts.goto);
    } else {
      await page.goto(opts.url, opts.goto);
    }

    if (_.isNumber(opts.waitFor) || _.isString(opts.waitFor)) {
      await page.waitFor(opts.waitFor);
    }

    if (opts.scrollPage) {
      await scrollPage(page);
    }

    if (config.DEBUG_MODE) {
      const msg = `\n\n---------------------------------\n
        Chrome does not support PDF rendering in "headed" mode.
        See this issue: https://github.com/GoogleChrome/puppeteer/issues/576
        \n---------------------------------\n\n
      `;
      throw new Error(msg);
    }

    data = await page.pdf(opts.pdf);
  } catch (err) {
    logger.error(`Error when rendering page: ${err}`);
    logger.error(err.stack);
    myPool.release(browser);
    throw err;
  }

  myPool.release(browser);
  return data;
}

async function scrollPage(page) {
  // Scroll to page end to trigger lazy loading elements
  await page.evaluate(() => {
    const scrollInterval = 100;
    const scrollStep = Math.floor(window.innerHeight / 2);
    const bottomThreshold = 400;

    function bottomPos() {
      return window.pageYOffset + window.innerHeight;
    }

    return new Promise((resolve, reject) => {
      function scrollDown() {
        window.scrollBy(0, scrollStep);

        if (document.body.scrollHeight - bottomPos() < bottomThreshold) {
          window.scrollTo(0, 0);
          setTimeout(resolve, 500);
          return;
        }

        setTimeout(scrollDown, scrollInterval);
      }

      setTimeout(reject, 30000);
      scrollDown();
    });
  });
}

function logOpts(opts) {
  const supressedOpts = _.cloneDeep(opts);
  if (opts.html) {
    supressedOpts.html = '...';
  }

  logger.info(`Rendering with opts: ${JSON.stringify(supressedOpts, null, 2)}`);
}

module.exports = {
  render,
};
