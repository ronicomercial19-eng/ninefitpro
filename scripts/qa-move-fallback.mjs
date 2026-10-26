import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=readFileSync('src/pages/9fit/Move.tsx','utf8');
const ast=ts.createSourceFile('Move.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='handleNewCoordinate')callback=node.initializer.arguments[0].getText(ast);ts.forEachChild(node,visit);}
visit(ast);assert.ok(callback);
let now=1000,distance=0,accuracy=null,speed=0;
const noop=()=>{},pathCoordinatesRef={current:[]},lastCoordRef={current:null},lastCoordinateAtRef={current:null};
const context={Date:{now:()=>now},window:{},setLastFixAt:noop,setGpsError:noop,setFallbackCenter:noop,setGpsAccuracy:value=>accuracy=value,
 setDistanceKm:update=>distance=update(distance),setCurrentSpeedKmh:value=>speed=value,setMaxSpeedKmh:noop,setCurrentStreet:noop,
 pathCoordinatesRef,lastCoordRef,lastCoordinateAtRef,mapInstanceRef:{current:null},updateStreetName:noop};
const compiled=ts.transpileModule('globalThis.callback='+callback,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
runInNewContext(compiled,context);
context.callback(-23.55,-46.63,null,8);now+=10000;context.callback(-23.549,-46.63,null,9);
assert.ok(distance>.1&&distance<.12,'distance must keep recording without Google Maps');
assert.equal(accuracy,9);assert.ok(speed>0&&speed!==10.2);assert.equal(pathCoordinatesRef.current.length,2);
console.log('PASS Move: GPS precision, path and distance continue without Google Maps; speed is measured.');
