# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
# Proxy handled by setupProxy.js in dev, for production we'd use Nginx, 
# but for this demo, we'll keep the dev server proxy or use 'serve' with a custom config.
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
