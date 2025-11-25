#!/bin/bash

# Ruta al archivo .env
ENV_FILE=".env"

# Verificar si el archivo .env existe
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: El archivo $ENV_FILE no existe."
  exit 1
fi

# Verificar si las credenciales de la base de datos están configuradas
if ! grep -q "DB_USER=" "$ENV_FILE" || ! grep -q "DB_PASSWORD=" "$ENV_FILE" || ! grep -q "DB_HOST=" "$ENV_FILE"; then
  echo "Error: Faltan credenciales de la base de datos en $ENV_FILE."
  exit 1
fi

echo "Credenciales de la base de datos verificadas."

# Reiniciar los servicios (ajusta el comando según tu sistema)
echo "Reiniciando servicios..."
systemctl restart nombre_del_servicio

if [ $? -eq 0 ]; then
  echo "Servicios reiniciados correctamente."
else
  echo "Error al reiniciar los servicios."
  exit 1
fi
