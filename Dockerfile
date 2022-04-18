FROM node:current-alpine

# Copy source
WORKDIR /app
COPY ./package.json /app
COPY ./package-lock.json /app

# Dependency Build (Support for Opus & Arm compatability build) & bot dependancies
RUN npm install \
    && npm prune --production

COPY . /app

# Start Bot
ENTRYPOINT ["npm"]
CMD ["start"]
