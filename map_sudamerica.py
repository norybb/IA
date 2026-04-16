from ortools.sat.python import cp_model as cp

# Crear el modelo
model = cp.CpModel()


# Crear variables
chile = model.NewIntVar(1, 3, 'Chile')
argentina = model.NewIntVar(1, 3, 'Argentina')
bolivia = model.NewIntVar(1, 3, 'Bolivia')
paraguay = model.NewIntVar(1, 3, 'Paraguay')
brasil = model.NewIntVar(1, 3, 'Brasil')


# Definir los paises vecinos y restricciones

mapa = [(chile, argentina), (chile, bolivia), (argentina, bolivia), (argentina, paraguay), (bolivia, paraguay), (bolivia, brasil), (paraguay, brasil)]

# El pais adyacente debe ser de distinto color

for r1, r2 in mapa:
    model.Add(r1 != r2)

sudamerica = [chile, argentina, bolivia, paraguay, brasil]


# Resolver 
solver = cp.CpSolver()
status = solver.Solve(model)


# Imprimir
if status == cp.OPTIMAL:
    for r in sudamerica:
        if solver.Value(r) == 1: print("verde ->", r.Name())
        elif solver.Value(r) == 2: print("rojo ->", r.Name())
        elif solver.Value(r) == 3: print("azul ->", r.Name())
else:
    print('No hay solución')


