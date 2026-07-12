#!/usr/bin/env python3
# Cambia el modelo que usa la app (app/model/) por otro .keras del MISMO tamaño (150x150).
# Uso:  ~/envs/tf/bin/python usar_modelo_en_app.py modelo_l2.keras
#
# Solo reescribe los pesos (group1-shard1of1.bin). El model.json, app.js y el canvas
# ya estan en 150, asi que no hay que tocarlos si el modelo es de 150x150.

import sys, os, json, numpy as np, keras

if len(sys.argv) < 2:
    print("Uso: python usar_modelo_en_app.py <modelo.keras>"); sys.exit(1)

ruta_modelo = sys.argv[1]
APP_MODEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "model")

# 1) Cargar el modelo y quitar capas sin peso de inferencia (augmentation/dropout)
modelo = keras.models.load_model(ruta_modelo, compile=False)
pesos = modelo.get_weights()   # ya vienen en orden: conv1 k/b, conv2 k/b, dense1 k/b, dense2 k/b

# 2) Leer el manifest actual de la app para saber el orden y las formas esperadas
man = json.load(open(os.path.join(APP_MODEL, "model.json")))["weightsManifest"][0]["weights"]

# 3) Verificar que las formas coinciden (si no, el modelo es de otra arquitectura/tamano)
assert len(pesos) == len(man), f"El modelo tiene {len(pesos)} pesos, la app espera {len(man)}"
for w, meta in zip(pesos, man):
    assert list(w.shape) == meta["shape"], (
        f"Forma distinta en {meta['name']}: modelo {list(w.shape)} vs app {meta['shape']}. "
        "El modelo debe ser de 150x150 con la misma arquitectura.")

# 4) Escribir los pesos nuevos (float32 little-endian, en el orden del manifest)
destino = os.path.join(APP_MODEL, "group1-shard1of1.bin")
with open(destino, "wb") as f:
    for w in pesos:
        f.write(w.astype("<f4").tobytes())

print(f"Listo. La app ahora usa: {ruta_modelo}")
print(f"Pesos escritos en: {destino} ({os.path.getsize(destino)/1e6:.1f} MB)")
print("Recarga la app con Ctrl+Shift+R para que el navegador tome el modelo nuevo.")
