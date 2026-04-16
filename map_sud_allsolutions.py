from ortools.sat.python import cp_model as cp


class SolutionPrinter(cp.CpSolverSolutionCallback):
    
    def __init__(self, variables):
        cp.CpSolverSolutionCallback.__init__(self)
        self.__variables = variables
        self.__solution_count = 0

    def OnSolutionCallback(self):
        self.__solution_count += 1

        for variables in self.__variables:
            if self.Value(variables) == 1: print(variables.Name(), '= Verde')
            elif self.Value(variables) == 2: print(variables.Name(), '= Rojo')
            elif self.Value(variables) == 3: print(variables.Name(), '= Azul')
        print()


    def SolutionCount(self):
        return self.__solution_count



# Crear el modelo
model = cp.CpModel()

# Crear las variables

chile = model.NewIntVar(1, 3, 'Chile')
argentina = model.NewIntVar(1, 3, 'Argentina')
bolivia = model.NewIntVar(1, 3, 'Bolivia')
paraguay = model.NewIntVar(1, 3, 'Paraguay')
brasil = model.NewIntVar(1, 3, 'Brasil')

sudamerica = [chile, argentina, bolivia, paraguay, brasil]

# Paises adyacentes
mapa = [(chile, argentina), (chile, bolivia), (argentina, bolivia), (argentina, paraguay), (bolivia, paraguay), (bolivia, brasil), (paraguay, brasil)]

# Definir la restricción, de que los paises no sean del mismo color.
# Recorrer todas las parejas
for r1, r2 in mapa:
    model.Add(r1 != r2)


# Crear solver
solver = cp.CpSolver()
solution_printer = SolutionPrinter(sudamerica)
solver.parameters.enumerate_all_solutions = True
status = solver.SearchForAllSolutions(model, solution_printer)

print('Total soluciones: ', solution_printer.SolutionCount())