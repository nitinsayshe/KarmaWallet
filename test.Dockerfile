FROM node:18-alpine

# This is internal to the container
RUN mkdir -p /kw-backend

# Change dir contexts
WORKDIR /kw-backend

# Install Typescript
RUN npm install --quiet typescript -g

COPY ./package*.json ./

# Install app dependencies
RUN npm install --ignore-scripts

# Copy the project source code into the container
COPY . /kw-backend

RUN npm run build

# run the tests
CMD ["npm", "run", "test"]

