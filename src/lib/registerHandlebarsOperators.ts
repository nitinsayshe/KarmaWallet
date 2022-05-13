/* eslint-disable prefer-rest-params */
/* eslint-disable eqeqeq */
/* eslint-disable func-names */

// https://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional
// https://gist.github.com/servel333/21e1eedbd70db5a7cfff327526c72bc5
const reduceOp = (args: any, reducer: any) => {
  args = Array.from(args);
  args.pop(); // => options
  const first = args.shift();
  return args.reduce(reducer, first);
};

export const registerHandlebarsOperators = (handlebars: any) => {
  handlebars.registerHelper({
    eq() { return reduceOp(arguments, (a: any, b: any) => a === b); },
    ne() { return reduceOp(arguments, (a: any, b: any) => a !== b); },
    lt() { return reduceOp(arguments, (a: any, b: any) => a < b); },
    gt() { return reduceOp(arguments, (a: any, b: any) => a > b); },
    lte() { return reduceOp(arguments, (a: any, b: any) => a <= b); },
    gte() { return reduceOp(arguments, (a: any, b: any) => a >= b); },
    and() { return reduceOp(arguments, (a: any, b: any) => a && b); },
    or() { return reduceOp(arguments, (a: any, b: any) => a || b); },
  });
};

/**
 * example for template usage
 *
 *
 *
  {{#if (or
          (eq section1 "foo")
          (ne section2 "bar"))}}
  .. content
  {{/if}}

  {{#if (or condA condB condC)}}
  .. content
  {{/if}}

 */
