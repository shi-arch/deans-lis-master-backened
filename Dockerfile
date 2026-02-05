FROM node:20

WORKDIR /app

# Install yarn
RUN npm install -g yarn --force

COPY package*.json yarn.lock* ./

# Install dependencies using yarn
RUN yarn install --frozen-lockfile
RUN yarn global add nodemon

COPY . .

EXPOSE 5000

# Use yarn start for production (can be overridden in docker-compose)
CMD ["yarn", "start"]
