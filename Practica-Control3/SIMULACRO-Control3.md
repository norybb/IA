# Simulacro Control 3 — Práctica

> Mismo formato que el control real: notebook Jupyter, sin IA.
> Paquetes permitidos: `kagglehub`, `tensorflow`, `pandas`, `numpy`, `sklearn`.
> Resuélvelo tú solo, de principio a fin, sin mirar apuntes la primera vez.
> Cronométrate. Si te trabas más de 5 min en un paso, anótalo y sigue: eso marca tu punto débil real.

---

## PARTE A — Regresión

**Dataset:** descárgalo con `kagglehub`. Usa uno de precios de casas, por ejemplo
`kagglehub.dataset_download("yasserh/housing-prices-dataset")`
(si ese no está, sirve cualquier CSV de regresión; incluso tu `casas.csv` local).

**Tu objetivo:** predecir el **precio**.

Tareas (escribe el código tú):

1. Carga el CSV en un DataFrame con `pandas`. Muestra `df.head()` y `df.shape`.
2. Explora: ¿cuántas filas y columnas? ¿cuál es la columna objetivo (y) y cuáles las entradas (X)?
3. Separa `X` e `y` con pandas (`drop` para X, selección de columna para y).
4. Divide en train/test con `sklearn` (`train_test_split`, 80/20).
5. Normaliza las entradas con `StandardScaler` — ¿por qué se ajusta (`fit`) SOLO con train?
6. Arma un modelo Keras de regresión. Pregúntate:
   - ¿Cuántas neuronas en la capa de salida y con qué activación?
   - ¿Qué `loss`? ¿Qué va en `metrics`?
7. Entrena y evalúa. Reporta **MAE** y **MSE** sobre test con `sklearn`
   (`mean_absolute_error`, `mean_squared_error`).
8. Interpreta: ¿el MAE en qué unidades está? Si el MSE es mucho más grande de lo
   esperado respecto al MAE, ¿qué te dice eso sobre los errores?

---

## PARTE B — Clasificación

**Dataset:** `kagglehub.dataset_download("uciml/iris")` (u otro de clasificación).
**Tu objetivo:** predecir la **especie** (categoría).

Tareas:

1. Carga y explora igual que en la Parte A.
2. Separa `X` e `y`. Ojo: aquí `y` es una categoría, no un número.
3. Split + normaliza las entradas.
4. Modelo Keras de clasificación. Pregúntate:
   - ¿Cuántas neuronas de salida? (pista: número de clases)
   - ¿`softmax` o `sigmoid`?
   - ¿`loss` = `sparse_categorical_crossentropy` o `categorical_crossentropy`?
     ¿De qué depende?
5. Entrena y evalúa.
6. Con `sklearn`, saca la **matriz de confusión** (`confusion_matrix`) y el
   **`classification_report`** (accuracy, precision, recall, F1 por clase).
7. Interpreta: ¿qué clase confunde más el modelo? ¿mira la fila o la columna para
   el recall de una clase?

---

## Autoevaluación (después de terminar)

- [ ] ¿Escribí todo el flujo sin frenarme?
- [ ] ¿Recordé que se instala `scikit-learn` pero se importa `sklearn`?
- [ ] ¿Recordé `Dense(1)` sin activación para regresión?
- [ ] ¿Recordé que `fit` del scaler va solo con train (no con test)?
- [ ] Puntos donde me trabé: ______________________
