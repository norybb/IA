from ortools.sat.python import cp_model as cp

# Tienes 4 asignaturas que debes asignar a bloques horarios (1=mañana, 2=tarde, 3=noche). 
# Las siguientes asignaturas no pueden ir en el mismo bloque porque comparten sala:
# Matemáticas - Física
# Matemáticas - Química
# Física      - Programación
# Química     - Programación

# En este caso no usaremos SolutionPrinter ya que no requerimos imprimir múltiples soluciones


# Crear modelo
modelo = cp.CpModel()

# Variables 
matematicas = modelo.NewIntVar(1, 3, 'Matemáticas')
fisica = modelo.NewIntVar(1, 3, 'Física')
quimica = modelo.NewIntVar(1, 3, 'Química')
programacion = modelo.NewIntVar(1, 3, 'Programación')


asignaturas = [matematicas, fisica, quimica, programacion]

# Pares que no pueden ir en el mismo bloque
comparten_sala = [(matematicas, fisica), (matematicas, quimica), (fisica, programacion), (quimica, programacion)]

# Definimos la restricción
for r1, r2 in comparten_sala:
    modelo.Add(r1 != r2)


# Definir el solver
solver = cp.CpSolver()
status = solver.Solve(modelo)

# Imprimir el mejor resultado posible
if status == cp.OPTIMAL:
    for v in asignaturas:
        if solver.Value(v) == 1: print(v.Name(), '--> Mañana')
        elif solver.Value(v) == 2: print(v.Name(), '--> Tarde')
        elif solver.Value(v) == 3: print(v.Name(), '--> Noche')
    