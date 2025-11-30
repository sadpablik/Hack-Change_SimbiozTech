FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

RUN addgroup -g 1001 -S nodeuser && \
    adduser -S nodeuser -u 1001

COPY . .

RUN chown -R nodeuser:nodeuser /app

USER nodeuser

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
