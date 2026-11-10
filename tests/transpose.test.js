import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = {};
vm.runInNewContext(fs.readFileSync('extension/transpose.js', 'utf8'), context);
const { offset, transpose } = context.UGZombieTranspose;

test('offset measures how far UG moved a chord', () => {
  assert.equal(offset('Em', 'F#m'), 2);
  assert.equal(offset('D/F#', 'E/G#'), 2);
  assert.equal(offset('C', 'B'), 11);
  assert.equal(offset('Bbmaj7', 'Bmaj7'), 1);
});
test('spelling and simplification changes are not transpositions', () => {
  assert.equal(offset('F#m', 'Gbm'), 0);
  assert.equal(offset('D/F#', 'D/Gb'), 0);
  assert.equal(offset('Cmaj7', 'C'), 0);
});
test('unparseable chords are ignored', () => {
  assert.equal(offset('N.C.', 'N.C.'), null);
  assert.equal(offset('Em', ''), null);
});
test('keys transpose with sharps or flats, keeping their quality', () => {
  assert.equal(transpose('Em', 2, false), 'F#m');
  assert.equal(transpose('Em', 2, true), 'Gbm');
  assert.equal(transpose(' Bb ', 3, false), 'C#');
  assert.equal(transpose('A minor', 3, false), 'C minor');
});
