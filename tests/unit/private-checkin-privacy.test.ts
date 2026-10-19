import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
it('never references private check-in storage from edge functions or AI context', () => {
  for (const entry of readdirSync('supabase/functions',{recursive:true})) {
    const name=String(entry); if (!name.endsWith('.ts')) continue;
    expect(readFileSync(join('supabase/functions',name),'utf8'),name).not.toContain('wellness_private_checkins');
  }
});
it('rejects sleep, mood, emotion and feeling keys in analytics call literals', () => {
  const failures:string[]=[];
  for (const entry of readdirSync('src',{recursive:true})) {
    const name=String(entry);if(!/\.tsx?$/.test(name))continue;
    const file=ts.createSourceFile(name,readFileSync(join('src',name),'utf8'),ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    function visit(node:ts.Node) {
      if(ts.isCallExpression(node)) {
        const callee=ts.isPropertyAccessExpression(node.expression)?node.expression.name.text:ts.isIdentifier(node.expression)?node.expression.text:'';
        if(['trackEvent','trackGrowthEvent','capturePosthogEvent'].includes(callee)) {
          function inspect(n:ts.Node) {
            if(ts.isPropertyAssignment(n) && /^(sleep|mood|emotion|feeling)(_|$)/i.test(n.name.getText(file).replace(/['"]/g,''))) failures.push(`${name}:${file.getLineAndCharacterOfPosition(n.pos).line+1}`);
            ts.forEachChild(n,inspect);
          }
          node.arguments.forEach(inspect);
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(file);
  }
  expect(failures).toEqual([]);
});
