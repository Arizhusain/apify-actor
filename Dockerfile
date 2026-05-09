# Use the official Apify Playwright+Chrome base image
FROM apify/actor-node-playwright-chrome:20

COPY package*.json ./

RUN npm --quiet set progress=false \
  && npm install \
  && echo "Node $(node --version) / NPM $(npm --version)"

COPY . ./

RUN npm run build

CMD npm start
