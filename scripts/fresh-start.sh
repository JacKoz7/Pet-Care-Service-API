#!/bin/bash

# Opcja: RESET=true/false (domyślnie true dla dev – ustaw w env jeśli nie chcesz resetu)
RESET=${RESET:-true}

echo "🚀 Startuję Pet-Care-Service-API (fresh mode)..."

# Zatrzymaj Docker całkowicie
echo "Zatrzymuję Docker..."
docker compose down

# Uruchom tylko DB
echo "Uruchamiam DB..."
docker compose up db -d
sleep 5

if [ "$RESET" = true ]; then
  echo "🔄 RESET: Czyścimy migracje i bazę..."
  rm -rf prisma/migrations/*
  mkdir -p prisma/migrations

  docker exec -it pet-care-service-api-db-1 psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS petcare;"
  docker exec -it pet-care-service-api-db-1 psql -U postgres -d postgres -c "CREATE DATABASE petcare;"

  echo "Baza zresetowana – czysta."
fi

# Stwórz/aplikuj migrację (to stworzy tabele)
echo "📦 Tworzę/aplikuję migrację..."
npx prisma migrate dev --name init-fresh

# Weryfikacja: Sprawdź tabele
echo "🔍 Weryfikuję tabele..."
TABLE_COUNT=$(docker exec pet-care-service-api-db-1 psql -U postgres -d petcare -t -c "\dt" | wc -l)
if [ $TABLE_COUNT -gt 1 ]; then
  echo "✅ Tabele stworzone! (Liczba: $((TABLE_COUNT-1))) – Odśwież DataGrip."
  docker exec pet-care-service-api-db-1 psql -U postgres -d petcare -c "\dt"  # Pokazuje listę
else
  echo "❌ Brak tabel – sprawdź logi migracji!"
  exit 1
fi

# Opcjonalnie: Seed danych (jeśli chcesz – odkomentuj)
# echo "🌱 Seeduję dane..."
# npx prisma db seed

# Zatrzymaj DB i uruchom całość (appka zrobi migrate-deploy + dev)
echo "🎯 Zatrzymuję DB i startuję app..."
docker compose stop db
docker compose up --build

echo "✅ Gotowe! Appka na http://localhost:3000. DataGrip: Refresh schematu."