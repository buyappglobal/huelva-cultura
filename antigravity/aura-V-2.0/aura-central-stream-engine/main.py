from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import logging
import os

# Configuración básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AuraCentral")

app = FastAPI(title="Aura Central Stream Engine")

# Seguridad: Leer API Key del entorno (con un valor por defecto para dev)
API_KEY = os.environ.get("STREAM_API_KEY", "aura_secreto_dev_123")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header != API_KEY:
        logger.warning("Intento de acceso denegado (API Key incorrecta)")
        raise HTTPException(status_code=403, detail="No autorizado. API Key inválida.")
    return api_key_header

# Diccionario en memoria para las conexiones persistentes
# Llave: cliente_id (str), Valor: WebSocket
conexiones_activas: dict[str, WebSocket] = {}

# Modelo estricto para recibir el JSON desde el panel de control
class ControlAction(BaseModel):
    cliente_id: str
    action: str
    url: str | None = None

@app.websocket("/ws/{cliente_id}")
async def websocket_endpoint(websocket: WebSocket, cliente_id: str):
    # Aceptar la conexión entrante
    await websocket.accept()
    
    # Registrar o sobreescribir la conexión de la Smart TV
    conexiones_activas[cliente_id] = websocket
    logger.info(f"Cliente conectado: {cliente_id}. Total activos: {len(conexiones_activas)}")
    
    try:
        # Bucle infinito para mantener el WebSocket abierto y escuchar a la TV
        while True:
            # Quedamos a la espera de mensajes (ping/pong o confirmaciones de estado)
            data = await websocket.receive_text()
            logger.debug(f"Mensaje de {cliente_id}: {data}")
            
    except WebSocketDisconnect:
        # Limpieza automática si la TV pierde conexión, se apaga, o corta red
        logger.info(f"Cliente desconectado: {cliente_id}")
        if cliente_id in conexiones_activas:
            del conexiones_activas[cliente_id]

@app.post("/api/control-panel")
async def control_panel(action_data: ControlAction, api_key: str = Depends(verify_api_key)):
    cliente_id = action_data.cliente_id
    
    # Verificar si la TV objetivo está conectada
    if cliente_id not in conexiones_activas:
        logger.warning(f"Intento de control a cliente offline: {cliente_id}")
        raise HTTPException(status_code=404, detail="El cliente no se encuentra conectado al Stream Engine.")
        
    websocket = conexiones_activas[cliente_id]
    
    # Preparamos el payload ignorando las claves vacías
    payload = action_data.model_dump(exclude_none=True)
    
    try:
        # Empujar el comando (push) en tiempo real por el websocket
        await websocket.send_json(payload)
        logger.info(f"Comando '{action_data.action}' enviado exitosamente a {cliente_id}")
        return {"status": "success", "message": "Comando enviado correctamente"}
    except Exception as e:
        logger.error(f"Error enviando comando a {cliente_id}: {e}")
        # Limpieza de salvaguarda ante un socket roto a bajo nivel
        if cliente_id in conexiones_activas:
            del conexiones_activas[cliente_id]
        raise HTTPException(status_code=500, detail="Error de I/O al tratar de comunicar con el WebSocket.")

@app.get("/health")
async def health_check():
    # Útil para los checks de salud internos de Google Cloud Run
    return {"status": "healthy", "conexiones": len(conexiones_activas)}
