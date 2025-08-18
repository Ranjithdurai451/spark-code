interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType: string;
  signature: string;
  isValid: boolean;
  language: string;
  algorithmPattern: string;
}
export function extractFunctionInfo(code: string, language: string): FunctionInfo {
  const extractors = {
    java: extractJavaFunction,
    javascript: extractJavaScriptFunction,
    typescript: extractTypeScriptFunction,
    python: extractPythonFunction,
    cpp: extractCppFunction,
    c: extractCFunction,
    go: extractGoFunction,
    csharp: extractCSharpFunction
  };

  const extractor = extractors[language.toLowerCase() as keyof typeof extractors];
  return extractor ? extractor(code) : createEmptyFunctionInfo(language);
}

export function extractJavaFunction(code: string): FunctionInfo {
  // Enhanced Java function patterns
  const patterns = [
    // Standard method with modifiers
    /(public|private|protected)?\s*(static)?\s*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/g,
    // Constructor pattern
    /(public|private|protected)?\s+(\w+)\s*\(([^)]*)\)/g
  ];

  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      let returnType, functionName, paramString;
      
      if (match.length === 6) {
        // Standard method
        [, , , returnType, functionName, paramString] = match;
      } else {
        // Constructor
        [, , functionName, paramString] = match;
        returnType = functionName; // Constructor "returns" the class type
      }

      // Skip excluded functions
      const excludedFunctions = [
        'main', 'toString', 'equals', 'hashCode', 'compareTo', 'clone',
        'getClass', 'notify', 'notifyAll', 'wait', 'finalize'
      ];
      
      if (excludedFunctions.includes(functionName.toLowerCase())) {
        continue;
      }

      // Check if it has a body
      const functionStart = match.index! + match[0].length;
      const afterMatch = code.substring(functionStart).trim();
      
      if (afterMatch.startsWith('{') && afterMatch.includes('}')) {
        const parameters = paramString.trim() 
          ? paramString.split(',').map(p => p.trim()) 
          : [];

        return {
          name: functionName,
          parameters,
          returnType: returnType || 'void',
          signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
          isValid: true,
          language: 'java',
          algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
        };
      }
    }
  }

  return createEmptyFunctionInfo('java');
}

export function extractJavaScriptFunction(code: string): FunctionInfo {
  const patterns = [
    // Function declarations
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Function expressions
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{/g,
    // Arrow functions
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*[\{]/g,
    // Arrow functions without parentheses
    /(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>\s*[\{]/g
  ];

  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, params] = match;
      
      if (['main', 'console', 'log', 'error', 'require'].includes(functionName.toLowerCase())) {
        continue;
      }

      const parameters = params && params !== functionName 
        ? params.split(',').map(p => p.trim()).filter(p => p) 
        : [];

      return {
        name: functionName,
        parameters,
        returnType: 'any',
        signature: `function ${functionName}(${parameters.join(', ')})`,
        isValid: true,
        language: 'javascript',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('javascript');
}

 export function extractTypeScriptFunction(code: string): FunctionInfo {
  const patterns = [
    // Function with return type
    /function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Function without return type
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Arrow function with return type
    /(?:const|let)\s+(\w+)\s*=\s*\(([^)]*)\)\s*:\s*([^=]+)\s*=>/g,
    // Arrow function without return type
    /(?:const|let)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g
  ];

  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, params, returnType] = match;
      
      if (['main', 'console', 'log', 'import', 'export'].includes(functionName.toLowerCase())) {
        continue;
      }

      const parameters = params 
        ? params.split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p)
        : [];

      return {
        name: functionName,
        parameters,
        returnType: returnType?.trim() || 'any',
        signature: `function ${functionName}(${parameters.join(', ')}): ${returnType || 'any'}`,
        isValid: true,
        language: 'typescript',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('typescript');
}

 export function extractPythonFunction(code: string): FunctionInfo {
  const pattern = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, functionName, paramString, returnType] = match;

    if (functionName.startsWith('__') || ['main'].includes(functionName.toLowerCase())) {
      continue;
    }

    // Check for function body
    const functionStart = match.index! + match[0].length;
    const afterColon = code.substring(functionStart);
    const nextLines = afterColon.split('\n').slice(1, 3);
    const hasBody = nextLines.some(line => line.trim() && (line.startsWith('    ') || line.startsWith('\t')));

    if (hasBody) {
      const parameters = paramString.trim()
        ? paramString.split(',')
            .map(p => p.trim().split(':')[0].trim())
            .filter(p => p && p !== 'self')
        : [];

      return {
        name: functionName,
        parameters,
        returnType: returnType?.trim() || 'Any',
        signature: `def ${functionName}(${parameters.join(', ')})${returnType ? ` -> ${returnType}` : ''}`,
        isValid: true,
        language: 'python',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('python');
}

export function extractCppFunction(code: string): FunctionInfo {
  const pattern = /(\w+(?:<[^>]+>)?(?:\s*[&*])*)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;

    if (['main', 'if', 'for', 'while'].includes(functionName.toLowerCase()) ||
        functionName.startsWith('~') || functionName.startsWith('operator')) {
      continue;
    }

    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim())
      : [];

    return {
      name: functionName,
      parameters,
      returnType,
      signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
      isValid: true,
      language: 'cpp',
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
    };
  }

  return createEmptyFunctionInfo('cpp');
}

export function extractCFunction(code: string): FunctionInfo {
  const pattern = /(\w+(?:\s*[*])*)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;

    if (['main', 'if', 'for', 'while', 'sizeof'].includes(functionName.toLowerCase())) {
      continue;
    }

    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim())
      : [];

    return {
      name: functionName,
      parameters,
      returnType,
      signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
      isValid: true,
      language: 'c',
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
    };
  }

  return createEmptyFunctionInfo('c');
}

  export function extractGoFunction(code: string): FunctionInfo {
  const pattern = /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, functionName, paramString, returnType] = match;

    if (['main', 'init'].includes(functionName.toLowerCase())) {
      continue;
    }

    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim())
      : [];

    return {
      name: functionName,
      parameters,
      returnType: returnType?.trim() || '',
      signature: `func ${functionName}(${parameters.join(', ')}) ${returnType || ''}`,
      isValid: true,
      language: 'go',
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
    };
  }

  return createEmptyFunctionInfo('go');
}

 export function extractCSharpFunction(code: string): FunctionInfo {
  const pattern = /(public|private|protected|internal)?\s*(static)?\s*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, , , returnType, functionName, paramString] = match;

    if (['Main', 'ToString', 'Equals', 'GetHashCode'].includes(functionName)) {
      continue;
    }

    const functionStart = match.index! + match[0].length;
    const afterMatch = code.substring(functionStart).trim();
    
    if (afterMatch.startsWith('{')) {
      const parameters = paramString.trim()
        ? paramString.split(',').map(p => p.trim())
        : [];

      return {
        name: functionName,
        parameters,
        returnType,
        signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
        isValid: true,
        language: 'csharp',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('csharp');
}

function createEmptyFunctionInfo(language: string): FunctionInfo {
  return {
    name: '',
    parameters: [],
    returnType: '',
    signature: '',
    isValid: false,
    language,
    algorithmPattern: 'unknown'
  };
}

// Enhanced algorithm pattern detection
function detectAlgorithmPattern(functionName: string, parameters: string[], code: string): string {
  const name = functionName.toLowerCase();
  const codeStr = code.toLowerCase();
  const paramStr = parameters.join(' ').toLowerCase();

  // Specific algorithm patterns
  const patterns = [
    { keywords: ['twosum', 'two_sum'], pattern: 'two_sum' },
    { keywords: ['threesum', 'three_sum'], pattern: 'three_sum' },
    { keywords: ['binary_search', 'binarysearch', 'search'], pattern: 'binary_search' },
    { keywords: ['reverse', 'reverselist', 'reverse_list'], pattern: 'linked_list_reversal' },
    { keywords: ['merge', 'mergelist', 'merge_list'], pattern: 'merge_lists' },
    { keywords: ['valid', 'isvalid', 'check'], pattern: 'validation' },
    { keywords: ['palindrome', 'ispalindrome'], pattern: 'palindrome_check' },
    { keywords: ['anagram', 'isanagram'], pattern: 'anagram_check' },
    { keywords: ['subarray', 'maxsubarray'], pattern: 'max_subarray' },
    { keywords: ['substring', 'longestsubstring'], pattern: 'longest_substring' },
    { keywords: ['permutation', 'permute'], pattern: 'permutations' },
    { keywords: ['combination', 'combine'], pattern: 'combinations' },
    { keywords: ['subset', 'subsets'], pattern: 'subsets' },
    { keywords: ['climb', 'stairs'], pattern: 'climbing_stairs' },
    { keywords: ['coin', 'change'], pattern: 'coin_change' },
    { keywords: ['fibonacci', 'fib'], pattern: 'fibonacci' },
    { keywords: ['island', 'islands'], pattern: 'number_of_islands' },
    { keywords: ['rotate', 'rotation'], pattern: 'rotation' },
    { keywords: ['depth', 'height'], pattern: 'tree_depth' },
    { keywords: ['inorder', 'preorder', 'postorder'], pattern: 'tree_traversal' }
  ];

  // Check function name first
  for (const { keywords, pattern } of patterns) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return pattern;
    }
  }

  // Check parameter patterns
  if (paramStr.includes('listnode')) return 'linked_list_operations';
  if (paramStr.includes('treenode')) return 'binary_tree_operations';
  if (paramStr.includes('target') && (paramStr.includes('array') || paramStr.includes('nums'))) return 'array_search';

  // Check code content patterns
  if (codeStr.includes('left') && codeStr.includes('right') && codeStr.includes('mid')) return 'binary_search';
  if (codeStr.includes('next') && (codeStr.includes('prev') || codeStr.includes('head'))) return 'linked_list_operations';
  if (codeStr.includes('left') && codeStr.includes('right') && codeStr.includes('root')) return 'binary_tree_operations';
  if (codeStr.includes('dp') || codeStr.includes('memo')) return 'dynamic_programming';
  if (codeStr.includes('visited') && (codeStr.includes('dfs') || codeStr.includes('bfs'))) return 'graph_traversal';

  return 'general_algorithm';
}