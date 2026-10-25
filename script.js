
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const historyList = document.getElementById("historyList");
const themeToggle = document.getElementById("themeToggle");
const angleToggle = document.getElementById("angleToggle");
const fractionDialog = document.getElementById("fractionDialog");
const fractionForm = document.getElementById("fractionForm");
const numeratorInput = document.getElementById("numerator");
const denominatorInput = document.getElementById("denominator");
const fractionError = document.getElementById("fractionError");

let tokens = [];
let history = [];
let angleMode = "DEG";
let justEvaluated = false;
let lastResult = null;

const operators = ["+", "-", "×", "÷", "^"];
const isOperator = value => operators.includes(value);
const isNumber = value => typeof value === "number" && Number.isFinite(value);
const isFraction = value => value && typeof value === "object" && value.type === "fraction";
const isNumericLiteral = value =>
  isNumber(value) ||
  (typeof value === "string" && /^\d+\.$/.test(value));

function formatNumber(value) {
  if (!Number.isFinite(value)) throw new Error("Resultado no válido");
  if (Math.abs(value) < 1e-12) value = 0;

  return Number(value.toPrecision(12)).toLocaleString("en-US", {
    maximumFractionDigits: 10,
    useGrouping: false
  });
}

function tokenToString(token) {
  if (isFraction(token)) return `(${token.numerator}/${token.denominator})`;
  if (token === "pi") return "π";
  if (token === "-") return "−";
  return String(token);
}

function expressionToString(items = tokens) {
  return items.length ? items.map(tokenToString).join(" ") : "0";
}

function isValueToken(token) {
  return isNumber(token) ||
    isNumericLiteral(token) ||
    isFraction(token) ||
    token === "pi" ||
    token === ")";
}

function appendMathText(container, text, className = "") {
  const span = document.createElement("span");
  if (className) span.className = className;
  span.textContent = String(text);
  container.appendChild(span);
  return span;
}

function renderMathExpression(container, items = tokens) {
  container.replaceChildren();

  if (!items.length) {
    appendMathText(container, "0");
    return;
  }

  for (let i = 0; i < items.length; i++) {
    const token = items[i];

    if (token === "sqrt" && items[i + 1] === "(") {
      let depth = 0;
      let closing = -1;

      for (let j = i + 1; j < items.length; j++) {
        if (items[j] === "(") depth++;
        if (items[j] === ")") {
          depth--;
          if (depth === 0) {
            closing = j;
            break;
          }
        }
      }

      if (closing !== -1) {
        const radical = document.createElement("span");
        radical.className = "math-radical";

        appendMathText(radical, "√", "radical-symbol");

        const radicand = document.createElement("span");
        radicand.className = "radicand";
        renderMathExpression(radicand, items.slice(i + 2, closing));

        radical.appendChild(radicand);
        container.appendChild(radical);
        i = closing;
        continue;
      }

      appendMathText(container, "√");
      continue;
    }

    if (isFraction(token)) {
      const fraction = document.createElement("span");
      fraction.className = "math-fraction";

      appendMathText(fraction, token.numerator, "fraction-numerator");
      appendMathText(fraction, token.denominator, "fraction-denominator");

      container.appendChild(fraction);
      continue;
    }

    if (token === "^" && i + 1 < items.length) {
      const exponent = document.createElement("sup");
      exponent.className = "math-exponent";
      exponent.textContent = tokenToString(items[i + 1]);
      container.appendChild(exponent);
      i++;
      continue;
    }

    let display = tokenToString(token);
    if (token === "×") display = "×";
    if (token === "÷") display = "÷";

    appendMathText(container, display, isOperator(token) ? "math-operator" : "");

    if (i < items.length - 1) {
      appendMathText(container, " ", "math-space");
    }
  }
}

function render() {
  renderMathExpression(expressionDisplay);

  // El resultado solo cambia al pulsar "=".
  if (!justEvaluated) {
    resultDisplay.textContent =
      lastResult === null ? "0" : formatNumber(lastResult);
  }
}

function clearAll() {
  tokens = [];
  justEvaluated = false;
  lastResult = null;
  resultDisplay.textContent = "0";
  render();
}

function appendNumber(value) {
  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];

  if (typeof last === "string" && /^\d+\.$/.test(last)) {
    tokens[tokens.length - 1] = Number(last + value);
    render();
    return;
  }

  if (isNumber(last)) {
    tokens[tokens.length - 1] = Number(String(last) + value);
    render();
    return;
  }

  if (isValueToken(last)) tokens.push("×");

  tokens.push(Number(value));
  render();
}

function appendDecimal() {
  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];

  if (typeof last === "string" && /^\d+\.$/.test(last)) return;

  if (isNumber(last)) {
    const text = String(last);
    if (!text.includes(".")) tokens[tokens.length - 1] = `${text}.`;
    render();
    return;
  }

  if (isValueToken(last)) tokens.push("×");

  tokens.push("0.");
  render();
}

function appendOperator(operator) {
  if (justEvaluated) {
    justEvaluated = false;
    lastResult = null;
  }

  if (!tokens.length) {
    if (operator === "-") tokens.push("-");
    render();
    return;
  }

  const last = tokens[tokens.length - 1];

  if (isOperator(last)) {
    if (operator === "-" && last !== "-") {
      tokens.push("-");
    } else {
      tokens[tokens.length - 1] = operator;
    }
  } else if (last === "(" && operator !== "-") {
    return;
  } else {
    tokens.push(operator);
  }

  render();
}

function appendParenthesis(value) {
  if (justEvaluated && value === "(") {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];

  if (value === "(" && isValueToken(last)) tokens.push("×");

  if (value === ")") {
    let depth = 0;

    for (const token of tokens) {
      if (token === "(") depth++;
      if (token === ")") depth--;
    }

    if (depth <= 0 || isOperator(last) || last === "(") return;
  }

  tokens.push(value);
  render();
}

function appendFunction(name) {
  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];
  if (isValueToken(last)) tokens.push("×");

  tokens.push(name, "(");
  render();
}

function appendPi() {
  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];
  if (isValueToken(last)) tokens.push("×");

  tokens.push("pi");
  render();
}

function backspace() {
  justEvaluated = false;
  lastResult = null;

  const last = tokens[tokens.length - 1];

  if (isNumber(last) || (typeof last === "string" && /^\d+\.$/.test(last))) {
    const shortened = String(last).slice(0, -1);

    if (!shortened || shortened === "-") {
      tokens.pop();
    } else if (shortened.endsWith(".")) {
      tokens[tokens.length - 1] = shortened;
    } else {
      tokens[tokens.length - 1] = Number(shortened);
    }
  } else {
    tokens.pop();
  }

  render();
}

function clearEntry() {
  justEvaluated = false;
  lastResult = null;

  if (!tokens.length) {
    render();
    return;
  }

  const last = tokens[tokens.length - 1];

  if (last === ")") {
    let depth = 1;
    tokens.pop();

    while (tokens.length && depth > 0) {
      const token = tokens.pop();
      if (token === ")") depth++;
      if (token === "(") depth--;
    }

    if (["sin", "cos", "tan", "sqrt"].includes(tokens[tokens.length - 1])) {
      tokens.pop();
    }
  } else {
    tokens.pop();
  }

  render();
}

function applySquare() {
  if (!tokens.length) return;

  const last = tokens[tokens.length - 1];

  if (isNumericLiteral(last) || isFraction(last) || last === "pi" || last === ")") {
    tokens.push("^", 2);
  } else {
    return;
  }

  justEvaluated = false;
  lastResult = null;
  render();
}

function applySquareRoot() {
  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];

  if (isValueToken(last)) {
    tokens.push("×", "sqrt", "(");
  } else {
    tokens.push("sqrt", "(");
  }

  render();
}

function toggleSign() {
  if (!tokens.length) {
    tokens.push("-");
    render();
    return;
  }

  const last = tokens[tokens.length - 1];

  if (isNumber(last)) {
    tokens[tokens.length - 1] = -last;
  } else if (last === ")") {
    tokens.push("^", -1);
  } else if (last === "pi") {
    tokens.splice(tokens.length - 1, 1, "-", "pi");
  } else if (isOperator(last)) {
    tokens.push("-");
  } else {
    tokens.unshift("-");
  }

  justEvaluated = false;
  lastResult = null;
  render();
}

function appendPercent() {
  if (!tokens.length) return;

  tokens.push("%");
  justEvaluated = false;
  lastResult = null;
  render();
}

function openFractionDialog() {
  fractionError.textContent = "";
  numeratorInput.value = "";
  denominatorInput.value = "";

  if (typeof fractionDialog.showModal === "function") {
    fractionDialog.showModal();
  } else {
    fractionDialog.setAttribute("open", "");
  }

  numeratorInput.focus();
}

function insertFraction(numerator, denominator) {
  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    lastResult = null;
  }

  const last = tokens[tokens.length - 1];
  if (isValueToken(last)) tokens.push("×");

  tokens.push({ type: "fraction", numerator, denominator });
  render();
}

function evaluateTokens(sourceTokens) {
  const parser = new Parser(sourceTokens, angleMode);
  const value = parser.parseExpression();

  if (!parser.isAtEnd()) throw new Error("Expresión incompleta");
  return value;
}

class Parser {
  constructor(input, mode) {
    this.input = input;
    this.position = 0;
    this.mode = mode;
  }

  peek() {
    return this.input[this.position];
  }

  consume() {
    return this.input[this.position++];
  }

  isAtEnd() {
    return this.position >= this.input.length;
  }

  parseExpression() {
    let value = this.parseTerm();

    while (this.peek() === "+" || this.peek() === "-") {
      const operator = this.consume();
      const right = this.parseTerm();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  parseTerm() {
    let value = this.parseUnary();

    while (this.peek() === "×" || this.peek() === "÷" || this.peek() === "%") {
      const operator = this.consume();

      if (operator === "%") {
        value /= 100;
        continue;
      }

      const right = this.parseUnary();

      if (operator === "×") {
        value *= right;
      } else {
        if (right === 0) throw new Error("No se puede dividir entre cero");
        value /= right;
      }
    }

    return value;
  }

  parseUnary() {
    if (this.peek() === "-") {
      this.consume();
      return -this.parseUnary();
    }

    if (this.peek() === "+") {
      this.consume();
      return this.parseUnary();
    }

    return this.parsePower();
  }

  parsePower() {
    let value = this.parsePrimary();

    if (this.peek() === "^") {
      this.consume();
      value = Math.pow(value, this.parseUnary());
    }

    return value;
  }

  parsePrimary() {
    const token = this.consume();

    if (token === undefined) throw new Error("Falta un número");

    if (isNumber(token)) return token;

    if (typeof token === "string" && /^\d+\.$/.test(token)) {
      return Number(token);
    }

    if (isFraction(token)) {
      if (token.denominator === 0) {
        throw new Error("El denominador no puede ser cero");
      }
      return token.numerator / token.denominator;
    }

    if (token === "pi") return Math.PI;

    if (token === "(") {
      const value = this.parseExpression();

      if (this.consume() !== ")") {
        throw new Error("Falta cerrar el paréntesis");
      }

      return value;
    }

    if (["sin", "cos", "tan", "sqrt"].includes(token)) {
      if (this.consume() !== "(") {
        throw new Error("Falta el paréntesis de la función");
      }

      const argument = this.parseExpression();

      if (this.consume() !== ")") {
        throw new Error("Falta cerrar la función");
      }

      if (token === "sqrt") {
        if (argument < 0) throw new Error("Raíz negativa no válida");
        return Math.sqrt(argument);
      }

      const angle = this.mode === "DEG"
        ? argument * Math.PI / 180
        : argument;

      if (token === "sin") return Math.sin(angle);
      if (token === "cos") return Math.cos(angle);

      if (Math.abs(Math.cos(angle)) < 1e-12) {
        throw new Error("Tangente no definida");
      }

      return Math.tan(angle);
    }

    throw new Error("Expresión no válida");
  }
}

function calculate() {
  if (!tokens.length) return;

  try {
    const sourceTokens = tokens.slice();
    const originalExpression = expressionToString(sourceTokens);
    const value = evaluateTokens(sourceTokens);
    const formatted = formatNumber(value);

    history.unshift({
      expression: originalExpression,
      result: formatted
    });

    if (history.length > 30) history.pop();

    renderHistory();

    tokens = [value];
    lastResult = value;
    justEvaluated = true;

    renderMathExpression(expressionDisplay, sourceTokens);
    resultDisplay.textContent = formatted;
  } catch (error) {
    resultDisplay.textContent = error.message || "Error";
    justEvaluated = false;
  }
}

function renderHistory() {
  historyList.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";

    const symbol = document.createElement("span");
    symbol.className = "empty-symbol";
    symbol.textContent = "∑";

    const message = document.createElement("p");
    message.textContent = "Tus cálculos aparecerán aquí.";

    empty.append(symbol, message);
    historyList.appendChild(empty);
    return;
  }

  history.forEach(item => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";

    const expression = document.createElement("div");
    expression.className = "history-expression";
    expression.textContent = item.expression;

    const result = document.createElement("div");
    result.className = "history-result";
    result.textContent = `= ${item.result}`;

    button.append(expression, result);

    button.addEventListener("click", () => {
      tokens = [Number(item.result)];
      lastResult = Number(item.result);
      justEvaluated = true;
      expressionDisplay.textContent = item.expression;
      resultDisplay.textContent = item.result;
    });

    historyList.appendChild(button);
  });
}

function setTheme() {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");

  themeToggle.textContent = light ? "☾" : "☼";
  themeToggle.setAttribute(
    "aria-label",
    light ? "Activar tema oscuro" : "Activar tema claro"
  );
}

function toggleAngleMode() {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleToggle.textContent = angleMode;
  render();
}

document.querySelectorAll("[data-value]").forEach(button => {
  button.addEventListener("click", () => {
    const value = button.dataset.value;

    if (value === ".") return appendDecimal();
    if (["+", "-", "×", "÷"].includes(value)) return appendOperator(value);
    if (value === "(" || value === ")") return appendParenthesis(value);
    if (value === "%") return appendPercent();
    if (/^\d$/.test(value)) return appendNumber(value);
  });
});

document.querySelectorAll("[data-function]").forEach(button => {
  button.addEventListener("click", () => {
    appendFunction(button.dataset.function);
  });
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    switch (button.dataset.action) {
      case "pi": appendPi(); break;
      case "sqrt": applySquareRoot(); break;
      case "square": applySquare(); break;
      case "power": appendOperator("^"); break;
      case "fraction": openFractionDialog(); break;
      case "backspace": backspace(); break;
      case "sign": toggleSign(); break;
      case "clear-entry": clearEntry(); break;
      case "equals": calculate(); break;
    }
  });
});

document.getElementById("clearBtn").addEventListener("click", clearAll);

document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  renderHistory();
});

themeToggle.addEventListener("click", setTheme);
angleToggle.addEventListener("click", toggleAngleMode);

document.getElementById("closeFraction").addEventListener("click", () => {
  fractionDialog.close();
});

fractionForm.addEventListener("submit", event => {
  event.preventDefault();

  const numeratorText = numeratorInput.value.trim().replace(",", ".");
  const denominatorText = denominatorInput.value.trim().replace(",", ".");
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);

  if (!numeratorText || !denominatorText ||
      !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    fractionError.textContent = "Introduce números válidos.";
    return;
  }

  if (denominator === 0) {
    fractionError.textContent = "El denominador no puede ser cero.";
    return;
  }

  insertFraction(numerator, denominator);
  fractionDialog.close();
});

fractionDialog.addEventListener("click", event => {
  if (event.target === fractionDialog) fractionDialog.close();
});

document.addEventListener("keydown", event => {
  if (fractionDialog.open) {
    if (event.key === "Escape") fractionDialog.close();
    return;
  }

  if (/^\d$/.test(event.key)) {
    appendNumber(event.key);
    return;
  }

  switch (event.key) {
    case ".":
    case ",":
      appendDecimal();
      break;
    case "+":
      appendOperator("+");
      break;
    case "-":
      appendOperator("-");
      break;
    case "*":
      appendOperator("×");
      break;
    case "/":
      event.preventDefault();
      appendOperator("÷");
      break;
    case "^":
      appendOperator("^");
      break;
    case "(":
    case ")":
      appendParenthesis(event.key);
      break;
    case "%":
      appendPercent();
      break;
    case "Enter":
    case "=":
      event.preventDefault();
      calculate();
      break;
    case "Backspace":
      backspace();
      break;
    case "Delete":
      clearEntry();
      break;
    case "Escape":
      clearAll();
      break;
  }
});

document.getElementById("currentYear").textContent =
  new Date().getFullYear();

render();
renderHistory();
