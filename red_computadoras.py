# Tienes una red donde algunos computadores están conectados entre sí. 
# Por seguridad, dos computadores conectados no pueden estar en la misma subred (color). Usa 3 subredes.
# Conexiones: (PC1,PC2), (PC1,PC3), (PC2,PC4), (PC3,PC4), (PC3,PC5)
from ortools.sat.python import cp_model as cp

class SolutionPrinter(cp.CpSolverSolutionCallback):

    def __init__(self, variables):
        cp.CpSolverSolutionCallback.__init__(self)
        self.__variables = variables
        self.__solution_count = 0

    def OnSolutionCallback(self):
        self.__solution_count += 1

        #variables a imprimir
        for v in self.__variables:
            if self.Value(v) == 1: print(v.Name(), '--> Subred 1')
            elif self.Value(v) == 2: print(v.Name(), '--> Subred 2')
            elif self.Value(v) == 3: print(v.Name(), '--> Subred 3')
        print()

    def SolutionCount(self):
        return self.__solution_count



# Crear el modelo
modelo = cp.CpModel()


# Variables
pc_1 = modelo.NewIntVar(1, 3, 'PC1')
pc_2 = modelo.NewIntVar(1, 3, 'PC2')
pc_3 = modelo.NewIntVar(1, 3, 'PC3')
pc_4 = modelo.NewIntVar(1, 3, 'PC4')
pc_5 = modelo.NewIntVar(1, 3, 'PC5')

total_pc = [pc_1, pc_2, pc_3, pc_4, pc_5]

#pares (conexiones)
conexion_pc = [(pc_1, pc_2), (pc_1, pc_3), (pc_2, pc_4), (pc_3, pc_4), (pc_3, pc_5)]

# Añadir restriccion y recorrer lista
for r1, r2 in conexion_pc:
    modelo.Add(r1 != r2)


#Usar solver y solutionprinter para visualizar todos los resultados
solver = cp.CpSolver()
solution_printer = SolutionPrinter(total_pc)
solver.parameters.enumerate_all_solutions = True
status = solver.SearchForAllSolutions(modelo, solution_printer)

print('Total soluciones: ', solution_printer.SolutionCount())