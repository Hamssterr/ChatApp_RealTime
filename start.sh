FROM node:18
WORKDIR /app/BackEnd
COPY BackEnd/package*.json ./
RUN npm install
COPY BackEnd/ .
EXPOSE 3000
CMD ["npm", "start"]