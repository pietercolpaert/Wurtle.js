// **N3GroupedStreamParser** parses a text stream into a quad stream.
import { Transform } from 'readable-stream';
import { ParserOptions, Quad} from 'n3';
import { EventEmitter } from "events";
import { NamedNode } from '@rdfjs/types';
import N3GroupedParser from './N3GroupedParser';

export default class N3GroupedStreamParser extends Transform {
  constructor(options: ParserOptions) {
    super({ decodeStrings: true });
    this._readableState.objectMode = true;
    if (!options)
      options = {};
    options.comments = true;
    // Set up parser with dummy stream to obtain `data` and `end` callbacks
    const parser = new N3GroupedParser(options);
    let onData: Function;
    let onEnd: Function;
    let input = new EventEmitter();
    input.on = (event: string, callback: Function): EventEmitter => {
      switch (event) {
      case 'data': onData = callback; break;
      case 'end':   onEnd = callback; break;
      }
      return this;
    };
    parser.parse(input, {
      // Handle quads by pushing them in each currently active group. 
      // If no active group is currently in place, it is going to emit the quad in their own group as it appears.
      onGroupedQuads: (error: Error, quadGroup: Quad[]) => {
        if (error) {
          this.emit('error', error);
        }
        else if (quadGroup) {
          this.push(quadGroup);
        }
      },
      // Emit prefixes through the `prefix` event
      onPrefix: (prefix: string, iri: NamedNode) => { this.emit('prefix', prefix, iri); },
      onComment: (comment: string) => { this.emit('comment', comment); },
    });

    // Implement Transform methods through parser callbacks
    this._transform = (chunk, encoding, done) => { onData(chunk); done(); };
    this._flush = done => { onEnd(); done(); };
  }

  // ### Parses a stream of strings
  import(stream: any) {
    stream.on('data',  (chunk: string) => { this.write(chunk); });
    stream.on('end',   ()      => { this.end(); });
    stream.on('error', (error: Error ) => { this.emit('error', error); });
    return this;
  }
}
