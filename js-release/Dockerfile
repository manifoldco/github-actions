FROM node:12-slim

RUN apt-get update && apt-get -y --no-install-recommends install git && rm -rf /var/lib/apt/lists/*
RUN npm install

ENTRYPOINT ["entrypoint.sh"]
CMD ["help"]
