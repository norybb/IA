from ortools.sat.python import cp_model as cp

# Tienes 4 asignaturas que debes asignar a bloques horarios (1=mañana, 2=tarde, 3=noche). 
# Las siguientes asignaturas no pueden ir en el mismo bloque porque comparten sala:
# Matemáticas - Física
# Matemáticas - Química
# Física      - Programación
# Química     - Programación

# Crear modelo
modelo = cp.CpModel()

# Variables 
matematicas = modelo.NewIntVar(1, 3, 'Matemáticas')
fisica = modelo.NewIntVar(1, 3, 'Física')
quimica = modelo.NewIntVar(1, 3, 'Química')
programacion = modelo.NewIntVar(1, 3, 'Programación')


