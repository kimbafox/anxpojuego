# anxpojuego

## Ranking + Discord (Railway)

El proyecto ahora incluye:

- Ranking persistente Top 20.
- Orden por mayor puntaje y, en empate, menor tiempo.
- Registro de resultado solo con cuenta de Discord conectada.
- Avatar de Discord pixelado en verde/negro junto al nombre, puntaje y tiempo.

### Variables de entorno en Railway

Configura estas variables en tu servicio:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (ejemplo: `https://tu-app.railway.app/api/discord/callback`)

Tambien debes registrar ese callback URL en tu aplicacion de Discord Developer Portal.

### Archivo de ranking

El servidor guarda el ranking en `ranking-data.json` en la raiz del proyecto.