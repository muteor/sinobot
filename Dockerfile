FROM alpine:latest

# Install
RUN apk add --update nodejs python make g++ && rm -rf /var/cache/apk/*

COPY package.json /src/package.json
COPY . /src
RUN cd /src; mkdir data; mkdir dist; npm install --only=prod; npm run build
RUN apk del python make g++

# Volumes
RUN mkdir -p /etc/sinobot/parsers
RUN mkdir -p /var/log/sinobot
VOLUME ["/var/log/sinobot"]

EXPOSE 9777

CMD ["sh", "/src/start.sh"]
