# Partially copied from https://github.com/ebidel/try-puppeteer/tree/4b68714dee5492b77a0fd6711d3abaf8bc72d995/backend
FROM node:8-slim
ENV DEBIAN_FRONTEND noninteractive

# Install latest chrome dev package.
# Note: this installs the necessary libs to make the bundled version of
# Chromium that Puppeteer installs, work.

# See https://crbug.com/795759
RUN apt-get update && apt-get install -yq libgconf-2-4
RUN sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections

RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable \
      --no-install-recommends \
    && apt-get install -y --no-install-recommends fontconfig ttf-mscorefonts-installer \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

COPY . /app/
WORKDIR app

RUN fc-cache -f -v

# Install deps for server.
# Cache bust so we always get the latest version of puppeteer when
# building the image.
ARG CACHEBUST=1
RUN yarn

# Uncomment to skip the chromium download when installing puppeteer.
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Add pptr user.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run user as non privileged.
USER pptruser

EXPOSE 9000
CMD ["node", "src/index.js"]