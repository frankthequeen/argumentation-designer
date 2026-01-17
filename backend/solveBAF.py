from flask import Flask, request, jsonify

import clingo
import os
import tempfile
import math
import numpy as np   # per ddr

app = Flask(__name__)

UPLOAD_FOLDER = '/var/www/compute/apxtemp/'  # Directory file temporanei

############################
# PARTE ASP CLASSICA BAF   #
############################

def concatena_file(graph, sem, output_file):
    try:
        with open(output_file, 'w', encoding='utf-8') as out_f:
            # Scrive il contenuto del grafo
            with open(graph, 'r', encoding='utf-8') as f1:
                out_f.write(f1.read())

            # aggiungi gli attacchi estesi
            out_f.write('\n')
            out_f.write('reaches(X,Y) :- support(X,Y).\n')
            out_f.write('reaches(X,Y) :- support(X,Z), reaches(Z,Y).\n')
            out_f.write('cycle(X) :- arg(X), reaches(X,X).\n')
            out_f.write('argu(X) :- arg(X), not cycle(X).\n')
            out_f.write('atta(X,Y) :- att(X,Y), argu(X), argu(Y).\n')
            out_f.write('atta(X,Y) :- att(X,Z), argu(X), argu(Z), support(Z,Y), argu(Y).\n')

            # Scrive il contenuto della semantica
            with open(sem, 'r', encoding='utf-8') as f2:
                out_f.write(f2.read())

            # Aggiunge le righe finali
            out_f.write('\n')
            out_f.write('ou(X) :- arg(X), cycle(X).\n')
            out_f.write('ou(X) :- argu(Y), atta(Y,X), in(Y).\n')
            out_f.write('un(X) :- argu(X), not in(X), not ou(X).\n')
            out_f.write('\n')
            out_f.write('#show in/1.\n')
            out_f.write('#show ou/1.\n')
            out_f.write('#show un/1.\n')
    except Exception as e:
        raise RuntimeError(f"Errore durante la creazione del file: {e}")

def quiet_logger(msg, code):
    pass

def compute(baf_file, sem):
    ctl = clingo.Control(logger=quiet_logger)
    ctl.configuration.solve.models = 0

    sem_path = os.path.join("sem", f"{sem}.dl")
    if not os.path.isfile(sem_path):
        raise RuntimeError(f"File semantica {sem_path} non trovato")

    # FILE TEMPORANEO temp.dl nella CHIARA CARTELLA TEMP
    temp_dl_path = os.path.join(UPLOAD_FOLDER, "temp.dl")

    concatena_file(baf_file, sem_path, temp_dl_path)

    ctl.load(temp_dl_path)
    ctl.ground([("base", [])])

    results = []
    with ctl.solve(yield_=True) as handle:
        for m in handle:
            results.append(str(m))

    if os.path.exists(temp_dl_path):
        os.remove(temp_dl_path)

    return results

############################
#   PARTE GRADUAL QBAF     #
############################

def parse_qbaf_from_string(input_data):
    """
    Versione da stringa della parse_input:
    - initial_scores
    - attackers
    - supporters
    """
    initial_scores = {}
    attackers = {}
    supporters = {}

    lines = [line.strip() for line in input_data.strip().splitlines() if line.strip()]

    # Prima passata: arg(...)
    for line in lines:
        if line.startswith('arg('):
            # es. arg(a,1.0).
            inside = line[len('arg('):-2]  # rimuove 'arg(' e ').'
            name, score = [x.strip() for x in inside.split(',')]
            initial_scores[name] = float(score)
            attackers[name] = []
            supporters[name] = []

    # Seconda passata: att(...), support(...)
    for line in lines:
        if line.startswith('att('):
            inside = line[len('att('):-2]
            source, target = [x.strip() for x in inside.split(',')]
            if target in attackers:
                attackers[target].append(source)
        elif line.startswith('support('):
            inside = line[len('support('):-2]
            source, target = [x.strip() for x in inside.split(',')]
            if target in supporters:
                supporters[target].append(source)

    return initial_scores, attackers, supporters

def alpha_plus(a, t, supporters, score, mode):
    r = 1
    for x in supporters[a]:
        if mode == "product":
            r *= (1 - score[x][t])
        else:
            r += (score[x][t])
    return r

def alpha_minus(a, t, attackers, score, mode):
    r = 1
    for x in attackers[a]:
        if mode == "product":
            r *= (1 - score[x][t])
        else:
            r += (score[x][t])
    return r

def aggregation(a, t, attackers, supporters, score, mode):
    alpha_m = alpha_minus(a, t, attackers, score, mode)
    alpha_p = alpha_plus(a, t, supporters, score, mode)

    if mode == "product":
        return alpha_m - alpha_p
    if mode == "sum":
        return alpha_p - alpha_m

    alpha = alpha_p - alpha_m
    if alpha_m == 0 and alpha_plus == 0:
        return alpha * abs(alpha)
    if mode == "deltamax":
        return alpha * abs(alpha) / max(alpha_p, alpha_m)
    return alpha * abs(alpha) / (alpha_p + alpha_m)

# SEMANTICS

def eul(a, t, attackers, supporters, score, params=None, gamma=None):
    tau_a = score[a][0]
    alpha = aggregation(a, t, attackers, supporters, score, "sum")
    return 1 - (1 - tau_a**2) / (1 + tau_a * (math.e**alpha))

def dfq(a, t, attackers, supporters, score, params=None, gamma=None):
    tau_a = score[a][0]
    alpha = aggregation(a, t, attackers, supporters, score, "product")
    return tau_a + tau_a * min(0, alpha) + (1 - tau_a) * max(0, alpha)

def qen(a, t, attackers, supporters, score, params=None, gamma=None):
    tau_a = score[a][0]
    agg = aggregation(a, t, attackers, supporters, score, "sum")

    E = (agg**2) / (1 + (agg**2))
    if agg <= 0:
        return (1 - E) * tau_a
    return E + (1 - E) * tau_a

#Quadratic Energy (deltasum/deltamax)
def mqe(a, t, attackers, supporters, score, params="deltasum", gamma=None):
    tau_a = score[a][0]
    agg = aggregation(a, t, attackers, supporters, score, params)
    E = (agg**2) / (1 + (agg**2))
    if agg <= 0:
        return (1 - E) * tau_a
    return E + (1 - E) * tau_a

def mlp(a, t, attackers, supporters, score, params=None, gamma=None):
    tau_a = score[a][0]
    alpha = aggregation(a, t, attackers, supporters, score, "sum")

    if tau_a == 0 or tau_a == 1:
        return tau_a

    v = math.log(tau_a / (1 - tau_a)) + alpha
    # notare: nell'originale si usa alpha, non v, per la sigmoide
    return 1 / (1 + math.exp(-alpha))

def drl(a, t, attackers, supporters, score, params, gamma=0.5):
    tau_a = score[a][0]
    delta = aggregation(a, t, attackers, supporters, score, params)
    return (max(-1, min(1, (2 * tau_a - 1 + delta * gamma / (1 - gamma)))) + 1) / 2

def ddr(a, t, attackers, supporters, score, params, gamma=0.5):
    tau_a = score[a][0]
    delta = aggregation(a, t, attackers, supporters, score, params)
    z = (2 * tau_a - 1 + delta * gamma / (1 - gamma))

    numerator = 1 + np.exp(100 * (z + 1))
    denominator = 1 + np.exp(100 * (z - 1))

    return ((1 / 100) * np.log(numerator / denominator)) / 2

def to_stop_qbaf(attackers, score, t, epsilon):
    for a in attackers.keys():
        if score[a][t] > score[a][t-1] + epsilon:
            return False
    return True

def compute_qbaf_with_results(content, sem, params=None, gamma=None, verbose=False, epsilon=1e-2):
    """
    content: stringa QBAF
    sem: 'drl', 'ddr', 'eul', 'dfq', 'mlp', 'qen'
    """
    initial_scores, attackers, supporters = parse_qbaf_from_string(content)

    score = {}
    for a in attackers.keys():
        score[a] = [initial_scores[a]]

    t = 0
    while True:
        for a in attackers.keys():
            if t == 0:
                score[a] = [initial_scores[a]]
            else:
                # chiama la semantica corrispondente (drl, ddr, eul, dfq, mlp, qen)
                score[a].append(
                    globals()[sem](a, t-1, attackers, supporters, score, params, gamma)
                )

        if t > 2 and to_stop_qbaf(attackers, score, t, epsilon):
            break
        t += 1

    # se vuoi debug, puoi stampare simile a stampa()
    if verbose:
        tmp = {}
        for a in attackers.keys():
            num = float(str(score[a][t]))
            tmp[a] = f"{num:.3f}"
        print(tmp)
        print("Total number of iterations=", str(t), "\n")

    final_scores = {a: float(f"{float(score[a][t]):.3f}") for a in attackers.keys()}
    return final_scores


############################
#    FILTRI CONSTRAINT     #
############################

import re

# Definizioni:
# - Un "Labelling" è una lista di stringhe che rappresentano gli stati degli elementi,
#   es. ['in(a)', 'ou(b)'].
# - I "Constraints" sono formule logiche proposizionali in formato stringa.
#   - AND è rappresentato da una virgola (,).
#   - OR è rappresentato da un punto e virgola (;).
#   - NOT è rappresentato da un punto esclamativo (!).
#   - Le parentesi tonde () definiscono la precedenza/annidamento.
#   - Le proposizioni atomiche sono gli stati, es. 'in(a)'.

class FormulaNode:
    """Nodo base per l'Albero di Sintassi Astratta (AST)."""
    def eval(self, labelling_set):
        """Valuta il nodo rispetto al set di stati (labelling)."""
        raise NotImplementedError

class AtomicProposition(FormulaNode):
    """Rappresenta un'unica proposizione (es. 'in(a)')."""
    def __init__(self, proposition):
        self.proposition = proposition.strip()

    def eval(self, labelling_set):
        # La proposizione atomica è vera se è presente nel labelling
        return self.proposition in labelling_set

    def __repr__(self):
        return f"Atomic('{self.proposition}')"

class UnaryOperator(FormulaNode):
    """Classe base per operatori unari (come NOT)."""
    def __init__(self, operand):
        self.operand = operand

class NotOperator(UnaryOperator):
    """Operatore NOT (!)."""
    def eval(self, labelling_set):
        return not self.operand.eval(labelling_set)

    def __repr__(self):
        return f"NOT({self.operand})"

class BinaryOperator(FormulaNode):
    """Classe base per operatori binari (come AND, OR)."""
    def __init__(self, left, right):
        self.left = left
        self.right = right

class AndOperator(BinaryOperator):
    """Operatore AND (,)."""
    def eval(self, labelling_set):
        return self.left.eval(labelling_set) and self.right.eval(labelling_set)

    def __repr__(self):
        return f"AND({self.left}, {self.right})"

class OrOperator(BinaryOperator):
    """Operatore OR (;)."""
    def eval(self, labelling_set):
        return self.left.eval(labelling_set) or self.right.eval(labelling_set)

    def __repr__(self):
        return f"OR({self.left}, {self.right})"

def _find_split_point(formula_str, operator_char):
    """
    Trova l'indice del principale operatore di divisione (virgola o punto e virgola)
    all'interno di una formula, rispettando le parentesi.
    Ritorna l'indice o -1 se non trovato.
    """
    balance = 0
    split_index = -1
    
    # Cerchiamo l'operatore con la precedenza più bassa (OR, poi AND)
    # L'indice più esterno è quello da splittare
    for i, char in enumerate(formula_str):
        if char == '(':
            balance += 1
        elif char == ')':
            balance -= 1
        elif balance == 0 and char == operator_char:
            split_index = i # Aggiorna all'operatore più a destra, che è il principale
            
    # Per l'OR (;) vogliamo l'ultimo trovato. Per l'AND (,) vogliamo l'ultimo trovato.
    # Questo implementa la valutazione da sinistra a destra per operatori di uguale precedenza.
    # Il parsing viene fatto ricorsivamente, quindi cerchiamo il più "esterno" in balance=0.
    return split_index

def _parse_formula_recursive(formula_str):
    """
    Converte una stringa di formula in un AST (Abstract Syntax Tree).
    Precedenza: Parentesi > NOT > AND (,) > OR (;)
    """
    formula_str = formula_str.strip()

    if not formula_str:
        raise ValueError("Formula stringa vuota o non valida.")

    # 1. Rimuovi le parentesi esterne ridondanti: es. ((A, B)) -> (A, B)
    while formula_str.startswith('(') and formula_str.endswith(')'):
        # Controlla se le parentesi sono veramente esterne (balance non scende sotto zero)
        balance = 0
        is_fully_enclosed = True
        for char in formula_str[1:-1]: # Escludi le parentesi esterne
            if char == '(':
                balance += 1
            elif char == ')':
                balance -= 1
            if balance < 0: # C'è una parentesi chiusa non bilanciata all'interno
                is_fully_enclosed = False
                break
        
        if is_fully_enclosed and balance == 0:
            formula_str = formula_str[1:-1].strip()
        else:
            break # Non sono parentesi esterne ridondanti

    # 2. Operatore NOT (!) - Massima precedenza (dopo le parentesi)
    if formula_str.startswith('!'):
        operand_str = formula_str[1:].strip()
        operand_node = _parse_formula_recursive(operand_str)
        return NotOperator(operand_node)

    # 3. Operatore OR (;) - Precedenza più bassa
    or_index = _find_split_point(formula_str, ';')
    if or_index != -1:
        left_str = formula_str[:or_index].strip()
        right_str = formula_str[or_index+1:].strip()
        left_node = _parse_formula_recursive(left_str)
        right_node = _parse_formula_recursive(right_str)
        return OrOperator(left_node, right_node)

    # 4. Operatore AND (,) - Precedenza media
    and_index = _find_split_point(formula_str, ',')
    if and_index != -1:
        left_str = formula_str[:and_index].strip()
        right_str = formula_str[and_index+1:].strip()
        left_node = _parse_formula_recursive(left_str)
        right_node = _parse_formula_recursive(right_str)
        return AndOperator(left_node, right_node)

    # 5. Proposizione Atomica (es. in(a))
    if re.fullmatch(r'^[a-z]+\([a-z]\)$', formula_str):
        return AtomicProposition(formula_str)
    
    raise ValueError(f"Constraint non valido o formato non gestito: '{formula_str}'")

def filtra_labelling(lab, const):
    """
    Filtra la lista di labelling (lab) per includere solo quelli che soddisfano
    tutti i vincoli (const).

    :param lab: Lista di labelling, dove ogni labelling è una lista di stringhe.
                Es: [['in(a)', 'ou(b)'], ['in(b)', 'ou(a)']]
    :param const: Lista di stringhe di constraint in logica proposizionale.
                  Es: ['(in(a), in(b)); ou(c)', '!in(a)']
    :return: Sottolista di lab che rispetta tutti i constraint.
    """
    
    # 1. Parsifica tutti i constraint in AST
    parsed_constraints = []
    try:
        for constraint_str in const:
            parsed_constraints.append(_parse_formula_recursive(constraint_str))
    except ValueError as e:
        print(f"ERRORE nel parsing dei constraints: {e}")
        return []

    lab_filtered = []
    
    # 2. Valuta ogni labelling rispetto a tutti i constraint
    for labelling in lab:
        # Trasforma il labelling in un set per lookup O(1)
        labelling_set = set(labelling)
        
        is_valid = True
        
        for constraint_node in parsed_constraints:
            # Se un constraint è FALSO per il labelling corrente,
            # il labelling non è valido.
            if not constraint_node.eval(labelling_set):
                is_valid = False
                break
        
        if is_valid:
            lab_filtered.append(labelling)
            
    return lab_filtered


############################
#         API FLASK        #
############################

@app.route('/api/computeBAF', methods=['POST'])
def computeBAF():
    print("computeBAF CALLED", flush=True)
    data = request.json

    if not data:
        return jsonify({"error": "JSON non trovato nel body"}), 400

    content = data.get('content')
    sem = data.get('semantics')

    if not content or not sem:
        return jsonify({"error": "Parametri 'content' e 'semantics' richiesti"}), 400

    if not os.path.isdir(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    try:
        # Scrive file temporaneo solo in UPLOAD_FOLDER
        with tempfile.NamedTemporaryFile(delete=False, dir=UPLOAD_FOLDER, suffix='.apx') as tf:
            tf.write(content.encode('utf-8'))
            temp_filepath = tf.name

        results = compute(temp_filepath, sem)

        os.remove(temp_filepath)  # Pulizia file temporaneo

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/compute', methods=['POST'])
def compute_classic():
    data = request.json

    filepath = data.get('filepath')
    sem = data.get('semantics')

    if not filepath or not sem:
        return jsonify({"error": "Parametri 'filepath' e 'semantics' richiesti"}), 400

    if not os.path.isfile(filepath):
        return jsonify({"error": f"File {filepath} non trovato"}), 404

    try:
        results = compute(filepath, sem)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/computeQBAF', methods=['POST'])
def computeQBAF():
    """
    Analogo a /api/computeBAF ma per QBAF graduale:
    - content: stringa QBAF
    - sem: 'drl', 'ddr', 'eul', 'dfq', 'mlp', 'qen'
    - params: opzionale ('standard', 'deltamax', 'deltasum', ecc.)
    - gamma: opzionale (float, default 0.5)
    - epsilon: opzionale (float, default 1e-2)
    - verbose: opzionale (bool)
    """
    data = request.json
    if not data:
        return jsonify({"error": "JSON non trovato nel body"}), 400

    content = data.get('content')
    sem = data.get('sem')
    params = data.get('params')
    gamma = data.get('gamma', 0.5)
    epsilon = data.get('epsilon', 1e-2)
    verbose = data.get('verbose', False)

    if not content or not sem:
        return jsonify({"error": "Parametri 'content' e 'sem' richiesti"}), 400

    try:
        final_scores = compute_qbaf_with_results(
            content=content,
            sem=sem,
            params=params,
            gamma=gamma,
            verbose=verbose,
            epsilon=epsilon
        )

        # converto in lista "string:number"
        results = [f"{arg}:{score}" for arg, score in final_scores.items()]
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/filterLabelings', methods=['POST'])
def filter_labelings_api():
    """
    API per filtrare i labelling in base a constraints logici.
    Input JSON:
    {
        "labelings": [["in(a)", "ou(b)"], ["in(b)", "ou(a)"]],
        "constraints": ["in(a); in(b)", "!ou(c)"]
    }
    Output JSON:
    {
        "results": [["in(a)", "ou(b)"]]
    }
    """
    print("filterLabelings API CALLED", flush=True)
    data = request.json
    
    if not data:
        return jsonify({"error": "JSON payload mancante"}), 400
        
    labelings = data.get('labelings')
    constraints = data.get('constraints')
    
    # Validazione input di base
    if labelings is None or constraints is None:
        return jsonify({"error": "Parametri 'labelings' e 'constraints' richiesti"}), 400
        
    if not isinstance(labelings, list):
         return jsonify({"error": "'labelings' deve essere una lista di liste"}), 400
         
    if not isinstance(constraints, list):
         return jsonify({"error": "'constraints' deve essere una lista di stringhe"}), 400

    try:
        # Esegue il filtraggio usando la funzione logica già definita
        filtered_results = filtra_labelling(labelings, constraints)
        
        return jsonify({"results": filtered_results})
        
    except Exception as e:
        print(f"Errore durante il filtraggio: {e}", flush=True)
        return jsonify({"error": str(e)}), 500


############################
#         TEST             #
############################


@app.route("/testcheck")
def testcheck():
    return "OK FROM THIS FILE"



def test_constraints():
    # --- Esempio di Utilizzo ---

    # Labelling di esempio (Nota: sono liste di stringhe)
    labelling_list = [
        ['in(a)', 'ou(b)', 'un(c)'],    # L1: soddisfa il constraint 1, non il 2
        ['in(a)', 'in(b)', 'ou(c)'],    # L2: soddisfa entrambi
        ['ou(a)', 'ou(b)', 'in(c)'],    # L3: soddisfa entrambi
        ['un(a)', 'un(b)', 'un(c)'],    # L4: non soddisfa il constraint 1, non il 2
        ['in(b)', 'in(c)', 'ou(a)'],    # L5: soddisfa il constraint 1, non il 2
    ]
    
    # Constraints di esempio (virgola=AND, punto e virgola=OR, punto esclamativo=NOT)
    # 1. (in(a) AND in(b)) OR ou(c)
    # 2. NOT in(a)
    constraints_list = [
        '(in(a), in(b)); un(c)', 
        '!in(a)'
    ]
    
    print("Labelling di Partenza:")
    for l in labelling_list:
        print(f"  {l}")
    
    print("\n Constraints:")
    for c in constraints_list:
        print(f"  {c}")
    
    # Esecuzione del metodo
    risultato_filtrato = filtra_labelling(labelling_list, constraints_list)
    
    print("\n Risultato Filtrato (Labelling che rispettano TUTTI i constraints):")
    for r in risultato_filtrato:
        print(f"  {r}")
    


############################
#          MAIN            #
############################
	
	
if __name__ == "__main__":
    #test_constraints()
    app.run(host='0.0.0.0', port=5000)