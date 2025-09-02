FROM node:20-alpine

WORKDIR /app

# Zainstaluj Prisma CLI globalnie
RUN npm install -g prisma

# Skopiuj pliki package
COPY package*.json ./
RUN npm install

# Skopiuj kod źródłowy
COPY . .

# Generuj Prisma Client
RUN npx prisma generate

# Zbuduj aplikację
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]