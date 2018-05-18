let input = document.getElementById('input');
let code = document.getElementById('code');
let log = document.getElementById('log');

input.addEventListener('input', () => {
  try {
    code.value = compiler(input.value);
  } catch (err) {
    console.error(err);
    log.value =
      '[' +
      new Date(Date.now()).toLocaleTimeString() +
      '] ' +
      err.message +
      '\n' +
      log.value;
  }
});

function compiler(input) {
  let tokens = tokenizer(input);
  let ast = parser(tokens);
  let newAst = transformer(ast);
  let output = codeGenerator(newAst);

  return output;
}

function tokenizer(input) {
  let current = 0;
  let tokens = [];

  while (current < input.length) {
    let char = input[current];

    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    // Pointer token
    if (char === '&') {
      char = input[++current];

      let HEX = /[0-9a-f]/i;
      if (HEX.test(char)) {
        tokens.push({
          type: 'pointer',
          char
        });
        current++;
        continue;
      }

      throw new TypeError('Invalid register: ' + char);
    }

    // Assign token
    if (char === '=') {
      tokens.push({
        type: 'assign',
        value: '='
      });

      current++;
      continue;
    }

    // Number token
    let NUMBERS = /[0-9]/;
    if (NUMBERS.test(char)) {
      let value = '';

      while (NUMBERS.test(char) && current < input.length) {
        value += char;
        char = input[++current];
      }

      tokens.push({
        type: 'number',
        value
      });
      continue;
    }

    // Name token
    let LETTERS = /[a-z]/i;
    if (LETTERS.test(char)) {
      let value = '';

      while (LETTERS.test(char) && current < input.length) {
        value += char;
        char = input[++current];
      }

      if (char === ':') {
        tokens.push({
          type: 'label',
          value
        });
        current++;
        continue;
      }

      let found = COMMANDS.find(e => {
        return e.name === value;
      });

      let type = 'name';
      if (found) {
        type = 'command';
      }

      tokens.push({
        type,
        value
      });
      continue;
    }

    // Open parenthesis token
    let SYMBOLS = /[(),]/;
    if (SYMBOLS.test(char)) {
      current++;
      continue;
    }

    throw new TypeError('Unknown character: ' + char);
  }

  return tokens;
}

function parser(tokens) {
  let current = 0;

  function walk() {
    let token = tokens[current];

    if (token.type === 'label') {
      current++;

      return {
        type: 'JumpLabel',
        value: token.value
      };
    }

    if (token.type === 'number') {
      current++;

      return {
        type: 'NumberLiteral',
        value: parseInt(token.value)
      };
    }

    if (token.type === 'assign') {
      current++;

      return {
        type: 'Assignment',
        value: walk()
      };
    }

    if (token.type === 'pointer') {
      current++;

      return {
        type: 'Register',
        value: token.char.toUpperCase()
      };
    }

    if (token.type === 'name') {
      current++;

      return {
        type: 'Variable',
        value: token.value
      };
    }

    if (token.type === 'command') {
      current++;

      let node = {
        type: 'Operation',
        name: token.value,
        params: []
      };

      let found = COMMANDS.find(e => {
        return e.name === token.value;
      });

      for (let i = 0; i < found.args; i++) {
        node.params.push(walk());
      }

      return node;
    }

    throw new TypeError(token.type);
  }

  let ast = {
    type: 'Program',
    body: []
  };

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  return ast;
}

function transformer(ast) {
  let newAst = {
    type: 'Program',
    body: []
  };

  for (let i = 0; i < ast.body.length; i++) {
    if (ast.body[i].type === 'Assignment') {
      ast.body[i].target = ast.body[i - 1];
      ast.body.splice(i - 1, 1);
      i--;
    }
  }

  newAst.body = ast.body;

  return newAst;
}

function codeGenerator(ast) {
  let variables = [
    {
      name: 'io',
      loc: 'FF'
    }
  ];

  let address = 16;
  let output = [];
  let registers = 0;

  function toHex(num) {
    if (num < 0 && num > -0x8000) {
      num = (-1 - num) ^ 0xffff;
    } else if (num >= 0x8000) {
      throw new TypeError('Number out of bounds: ' + num);
    }

    let hex = num.toString(16).toUpperCase();
    while (hex.length < 4) {
      hex = '0' + hex;
    }

    return hex;
  }

  function findVariable(name) {
    let variable = variables.find(e => {
      return e.name === name;
    });

    if (!variable) {
      throw new TypeError('Undefined variable: ' + name);
    }

    return variable.loc;
  }

  function assemble(node) {
    let destination;

    switch (node.type) {
      case 'Program': {
        node.body.map(assemble);
        break;
      }
      case 'Assignment': {
        if (node.value.type === 'NumberLiteral') {
          let val = toHex(node.value.value);
          let addr = assemble(node.target);
          let code = addr + ': ' + val;
          output.push(code);
          return true;
        } else {
          let register = assemble(node.value);
          let addr;
          if (node.target.type === 'Variable') {
            addr = findVariable(node.target.value);
          } else {
            addr = assemble(node.target);
          }
          code = toHex(address++).substring(2, 4) + ': 9';
          code += register + addr;
          output.push(code);
          return true;
        }
      }
      case 'NumberLiteral': {
        let newVar = {
          name: node.value,
          loc: toHex(0xff - variables.length).substring(2, 4)
        };
        variables.push(newVar);

        let code = newVar.loc + ': ' + toHex(node.value);
        output.push(code);

        destination = toHex(15 - registers++).substring(3, 4);
        code = toHex(address++).substring(2, 4) + ': 8';
        code += destination + newVar.loc;
        output.push(code);
        return destination;
      }
      case 'Operation': {
        switch (node.name) {
          case 'let': {
            let newVar = {
              name: node.params[0].value,
              loc: toHex(0xff - variables.length).substring(2, 4)
            };
            variables.push(newVar);
            return newVar.loc;
          }
          case 'add': {
            registers = 0;
            let first = assemble(node.params[0]);
            let second = assemble(node.params[1]);
            let destination = toHex(address++).substring(2, 4);
            let code = destination + ': 1D';
            code += first + second;
            output.push(code);
            return 'D';
          }
          default:
            throw new TypeError('This should never happen.');
        }
      }
      case 'Variable': {
        destination = toHex(15 - registers++).substring(3, 4);
        let code = toHex(address++).substring(2, 4) + ': 8';
        code += destination + findVariable(node.value);
        output.push(code);
        return destination;
      }
      default:
        throw new TypeError(node.type);
    }
  }

  assemble(ast);
  return output.sort().join('\n');
}

let COMMANDS = [
  { name: 'let', args: 1 },
  { name: 'add', args: 2 },
  { name: 'sub', args: 2 },
  { name: 'and', args: 2 },
  { name: 'xor', args: 2 },
  { name: 'shiftr', args: 2 },
  { name: 'shiftl', args: 2 },
  { name: 'jz', args: 2 },
  { name: 'jp', args: 2 },
  { name: 'exit', args: 0 }
];