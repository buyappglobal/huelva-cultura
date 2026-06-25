# 1. Usar una imagen base de Python minimalista y optimizada para contenedores
FROM python:3.11-slim

# 2. Configurar el directorio de trabajo interno
WORKDIR /app

# 3. Optimización de variables de entorno de Python
# PYTHONDONTWRITEBYTECODE: Evita la creación de archivos .pyc en disco (mejor rendimiento)
# PYTHONUNBUFFERED: Evita cuellos de botella en Cloud Logging mostrando logs de inmediato
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 4. Copiar e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Copiar todo el código fuente de la aplicación
COPY . .

# 6. Exponer puerto 8080 (mandatorio para Google Cloud Run)
EXPOSE 8080

# 7. Ejecutar el servidor con Uvicorn
# Ajustamos encabezados para proxies (Load Balancers de GCP)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
