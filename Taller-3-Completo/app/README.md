# App web de reconocimiento de senas numericas

Esta carpeta contiene una app HTML/CSS/JS simple para usar el modelo `modelo_base_combinado.keras` convertido a TensorFlow.js.

## Estructura esperada

```text
app/
  index.html
  styles.css
  app.js
  vendor/
    tf.min.js
    opencv.js
  model/
    model.json
    group1-shard1of2.bin
    group1-shard2of2.bin
```

La app carga el modelo desde:

```text
app/model/model.json
```

## Entrada del modelo

- Imagen `64x64`.
- RGB.
- `float32`.
- Normalizada dividiendo por `255`.
- Batch shape `[1, 64, 64, 3]`.
- Clases `0` a `9` en orden.

## Ejecutar

Desde la raiz del proyecto:

```bash
python3 -m http.server 8000
```

Luego abre:

```text
http://localhost:8000/app/
```

La camara requiere `localhost` o HTTPS. TensorFlow.js y OpenCV.js quedan locales en `app/vendor/`.

## Verificacion en consola

Al presionar `Activar camara`, la consola debe mostrar:

- `TensorFlow.js cargado`
- `OpenCV.js cargado`
- `modelo cargado`
- `camara iniciada`
- `input shape`
- `output shape`

Si el archivo `app/model/model.json` no existe o no corresponde al modelo convertido, la app mostrara `No se pudo cargar el modelo`.
