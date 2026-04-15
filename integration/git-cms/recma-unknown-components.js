/**
 * recmaUnknownComponents
 *
 * A recma plugin (ESTree transform) that prevents MDX from throwing when an
 * unknown capitalised tag is used in an .mdx file (e.g. a typo like <Images>).
 *
 * MDX v3 compiles unknown tags into one of two patterns inside _createMdxContent:
 *
 * Pattern A — only custom components, no HTML elements:
 *   const { Images } = props.components || {};
 *   if (!Images) _missingMdxReference("Images", true);
 *
 * Pattern B — mix of HTML elements and custom components:
 *   const _components = { h1: "h1", ...props.components }, { Images } = _components;
 *   if (!Images) _missingMdxReference("Images", true);
 *
 * This plugin:
 *   1. Injects `const __unknownComponent = props.components?.__unknownComponent;`
 *      at the top of _createMdxContent.
 *   2. Adds `= __unknownComponent("Images")` as the default value for every
 *      unresolved component in any ObjectPattern destructuring whose init is
 *      either `props.components || {}` (Pattern A) or `_components` (Pattern B).
 *      The name string is passed so the fallback component can display it.
 *   3. Removes every `if (!X) _missingMdxReference(...)` guard.
 *
 * `__unknownComponent` in the components map must be a factory function:
 *   (name: string) => AstroComponent
 * See mdx-components.ts.
 */

export function recmaUnknownComponents() {
  return (tree) => {
    for (const node of tree.body) {
      if (
        node.type !== 'FunctionDeclaration' ||
        node.id?.name !== '_createMdxContent'
      ) continue;

      const body = node.body.body;

      // 1. Inject `const __unknownComponent = props.components?.__unknownComponent;`
      //    at the very top of _createMdxContent so it is in scope for defaults below.
      const fallbackDecl = {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [{
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: '__unknownComponent' },
          // props.components?.__unknownComponent
          init: {
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'props' },
              property: { type: 'Identifier', name: 'components' },
              computed: false,
              optional: false,
            },
            property: { type: 'Identifier', name: '__unknownComponent' },
            computed: false,
            optional: true,
          },
        }],
      };
      body.unshift(fallbackDecl);

      // Walk remaining statements (start at 1 because we just unshifted).
      for (let i = 1; i < body.length; i++) {
        const stmt = body[i];

        // 2. Patch ObjectPattern destructuring for both patterns.
        if (stmt.type === 'VariableDeclaration' && stmt.kind === 'const') {
          for (const decl of stmt.declarations) {
            if (decl.id.type !== 'ObjectPattern') continue;
            if (!isComponentsSource(decl.init)) continue;

            for (const prop of decl.id.properties) {
              if (prop.type !== 'Property') continue;
              // Only patch plain identifier values (shorthand or renamed).
              // Skip ones already wrapped in AssignmentPattern.
              if (prop.value.type === 'Identifier') {
                const componentName = prop.key.type === 'Identifier' ? prop.key.name : prop.value.name;
                prop.value = {
                  type: 'AssignmentPattern',
                  left: { type: 'Identifier', name: prop.value.name },
                  // __unknownComponent?.("Images") — optional call in case
                  // __unknownComponent is not provided in the components map.
                  right: {
                    type: 'ChainExpression',
                    expression: {
                      type: 'CallExpression',
                      optional: true,
                      callee: { type: 'Identifier', name: '__unknownComponent' },
                      arguments: [{ type: 'Literal', value: componentName }],
                    },
                  },
                };
                prop.shorthand = false;
              }
            }
          }
        }

        // 3. Remove `if (!X) _missingMdxReference(...)` guards.
        if (
          stmt.type === 'IfStatement' &&
          stmt.test.type === 'UnaryExpression' &&
          stmt.test.operator === '!' &&
          stmt.consequent.type === 'ExpressionStatement' &&
          stmt.consequent.expression.type === 'CallExpression' &&
          stmt.consequent.expression.callee.type === 'Identifier' &&
          stmt.consequent.expression.callee.name === '_missingMdxReference'
        ) {
          body[i] = { type: 'EmptyStatement' };
        }
      }
    }
  };
}

/**
 * Returns true if `node` is a valid source for component destructuring.
 */
function isComponentsSource(node) {
  if (!node) return false;

  // Unwrap `X || {}` logical expressions.
  if (node.type === 'LogicalExpression' && node.operator === '||') {
    return isComponentsSource(node.left);
  }

  // `props.components`
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'props' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'components'
  ) return true;

  // `_components`
  if (node.type === 'Identifier' && node.name === '_components') return true;

  return false;
}
