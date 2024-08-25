import { NamedNode } from 'n3';
import GroupedStreamParser from '../dist/N3GroupedStreamParser';
import { Readable, Writable } from 'readable-stream';

describe('GroupedStreamParser', () => {
  describe('The GroupedStreamParser export', () => {
    it('should be a function', () => {
      expect(typeof GroupedStreamParser).toEqual('function');
    });

    it('should be a GroupedStreamParser constructor', () => {
      expect(new GroupedStreamParser()).toBeInstanceOf(GroupedStreamParser);
    });
    it('should be a GroupedStreamParser constructor with options', () => {
      expect(new GroupedStreamParser({})).toBeInstanceOf(GroupedStreamParser);
    });
  });

  describe('A GroupedStreamParser instance', () => {
    it('parses the empty stream', shouldParseInGroups([], 0));

    it('parses the zero-length stream', shouldParseInGroups([''], 0));

    it('parses the Bom starting stream', shouldParseInGroups(['\ufeff'], 0));

    it(
      'parses the Bom starting stream when first chunk ""',
      shouldParseInGroups(['', '\ufeff'], 0),
    );

    it('parses one triple', shouldParseInGroups(['<a> <b> <c>.'], 1));

    it(
      'parses two triples',
      shouldParseInGroups(['<a> <b>', ' <c>. <d> <e> ', '<f>.'], 2),
    );

    it(
      'parses three triples in two groups',
      shouldParseInGroups(['# @group begin 1\n <a> <b> <c>. \n# @group end 1\n# @group begin 2\n <d> <e> <f>.<g> <h> <i> . \n# @group end 2\n'], 2),
    );

    it(
      'should parse decimals that are split across chunks in the stream',
      shouldParseInGroups('<sub> <pred> 11.2 .'.match(/.{1,2}/g), 1),
    );

    it(
      'should parse non-breaking spaces that are split across chunks in the stream correctly',
      done => {
        const buffer = Buffer.from('<sub> <pred> " " .'),
            chunks = [buffer, buffer.slice(0, 15), buffer.slice(15, buffer.length)];
        shouldParseInGroups(chunks, 2, triples => {
          expect(triples[0]).toEqual(triples[1]);
        })(done);
      },
    );

    it(
      "doesn't parse an invalid stream",
      shouldNotParse(['z.'], 'Unexpected "z." on line 1.'),
      { token: undefined, line: 1, previousToken: undefined },
    );

    it(
      'Should Not parse Bom in middle stream',
      shouldNotParse(['<a> <b>', '\ufeff', '<c>.'], 'Unexpected "" on line 1.'),
    );

    it(
      'emits "prefix" events',
      shouldEmitPrefixes(['@prefix a: <http://a.org/#>. a:a a:b a:c. @prefix b: <http://b.org/#>.'],
                         { a: new NamedNode('http://a.org/#'), b: new NamedNode('http://b.org/#') }),
    );

    it('passes an error', () => {
      const input = new Readable(), parser = new GroupedStreamParser();
      let error = null;
      input._read = function () {};
      parser.on('error', e => { error = e; });
      parser.import(input);
      input.emit('error', new Error());
      expect(error).toBeInstanceOf(Error);
    });
  });
});


function shouldParseInGroups(chunks, expectedLength, validateTriples) {
  return function (done) {
    const triples = [],
        inputStream = new ArrayReader(chunks),
        parser = new GroupedStreamParser(),
        outputStream = new ArrayWriter(triples);
    expect(parser.import(inputStream)).toBe(parser);
    parser.pipe(outputStream);
    parser.on('error', done);
    parser.on('end', () => {
      expect(triples).toHaveLength(expectedLength);
      if (validateTriples) validateTriples(triples);
      done();
    });
  };
}

function shouldNotParse(chunks, expectedMessage, expectedContext) {
  return function (done) {
    const inputStream = new ArrayReader(chunks),
        parser = new GroupedStreamParser(),
        outputStream = new ArrayWriter([]);
    inputStream.pipe(parser);
    parser.pipe(outputStream);
    parser.on('error', error => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(expectedMessage);
      if (expectedContext) expect(error.context).toEqual(expectedContext);
      done();
    });
  };
}

function shouldEmitPrefixes(chunks, expectedPrefixes) {
  return function (done) {
    const prefixes = {},
        parser = new GroupedStreamParser(),
        inputStream = new ArrayReader(chunks);
    inputStream.pipe(parser);
    parser.on('data', () => {});
    parser.on('prefix', (prefix, iri) => { prefixes[prefix] = iri; });
    parser.on('error', done);
    parser.on('end', error => {
      expect(prefixes).toEqual(expectedPrefixes);
      done(error);
    });
  };
}



function ArrayReader(items) {
  const reader = new Readable();
  reader._read = function () { this.push(items.shift() || null); };
  return reader;
}

function ArrayWriter(items) {
  const writer = new Writable({ objectMode: true });
  writer._write = function (chunk, encoding, done) { items.push(chunk); done(); };
  return writer;
}
