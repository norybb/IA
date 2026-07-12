#!/usr/bin/env python3
# Servidor HTTPS local para probar la app con la camara del celular.
# Uso:  python3 servidor_https.py
# Luego, desde el celu (misma WiFi):  https://192.168.1.29:8443/app/
import http.server
import ssl
import os

# Servir desde la carpeta donde esta este archivo (Taller-3-Completo)
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PUERTO = 8443
server_address = ("0.0.0.0", PUERTO)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

print(f"Servidor HTTPS corriendo en el puerto {PUERTO}")
print(f"En este PC:      https://localhost:{PUERTO}/app/")
print(f"En el celular:   https://192.168.1.29:{PUERTO}/app/  (misma WiFi)")
print("Para detener: Ctrl+C")
httpd.serve_forever()
