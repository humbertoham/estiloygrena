INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
VALUES
  ('address', 'Gral. Plutarco Elías Calles 3216, Riberas del Río, 67160 Guadalupe, N.L., México', CURRENT_TIMESTAMP),
  ('googleMapsUrl', 'https://www.google.com/maps/search/?api=1&query=Estilo%20y%20Gre%C3%B1a%2C%20Gral.%20Plutarco%20El%C3%ADas%20Calles%203216%2C%20Riberas%20del%20R%C3%ADo%2C%2067160%20Guadalupe%2C%20N.L.%2C%20M%C3%A9xico', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP;
