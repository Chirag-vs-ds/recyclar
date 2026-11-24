import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, newGame, sortItem } from '../src/game.js';
test('all six objects can complete a 60-point round',()=>{let state=newGame();for(const item of ITEMS)state=sortItem(state,item.id,item.type).state;assert.equal(state.score,60);assert.equal(state.sorted.length,6);});
test('wrong answer preserves object and score, allowing retry',()=>{const wrong=sortItem(newGame(),'apple','dry');assert.equal(wrong.correct,false);assert.equal(wrong.state.mistakes,1);assert.equal(wrong.state.score,0);assert.deepEqual(wrong.state.sorted,[]);assert.equal(sortItem(wrong.state,'apple','wet').state.score,10);});
test('repeated and invalid submissions cannot gain points',()=>{const state=sortItem(newGame(),'can','dry').state;for(const [id,bin] of [['can','dry'],['missing','wet'],['paper','other']]){const result=sortItem(state,id,bin);assert.equal(result.ignored,true);assert.equal(result.state,state);}});
test('restart has no previous round data',()=>{const state=sortItem(newGame(),'leaf','wet').state;assert.equal(state.score,10);assert.deepEqual(newGame(),{score:0,sorted:[],mistakes:0});});
