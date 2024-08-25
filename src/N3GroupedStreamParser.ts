// **N3GroupedStreamParser** parses a text stream into a quad stream.
import { Transform } from 'readable-stream';
import {Parser, ParserOptions, Quad} from 'n3';
import { EventEmitter } from "events";
import { NamedNode } from '@rdfjs/types';

export default class N3GroupedStreamParser extends Transform {
  private _groups;
  constructor(options: ParserOptions) {
    super({ decodeStrings: true });
    this._groups = new Map();
    this._readableState.objectMode = true;
    if (!options)
      options = {};
    options.comments = true;
    // Set up parser with dummy stream to obtain `data` and `end` callbacks
    const parser = new Parser(options);
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
      // Handle quads by pushing them in each active group. If no active group is currently
      onQuad: (error: Error, quad: Quad) => {
        if (error) {
          this.emit('error', error);
        }
        else if (quad) {
          if (this._groups.size > 0) {
            this._groups.forEach(group => {
              group.push(quad);
            });
          }
          else {
            // push a 1 quad group
            this.push([quad]);
          }
        }
      },
      // Emit prefixes through the `prefix` event
      onPrefix: (prefix: string, iri: NamedNode) => { this.emit('prefix', prefix, iri); },
      onComment: (comment: string) => {
        // Parse comment and try to find a start pragma
        const foundBegin = comment.match(/\s*@group\s+begin\s+(.*)\s*/);
        if (foundBegin && foundBegin[1]) {
          this._groups.set(foundBegin[1], []);
        }
        // Parse comment
        const foundEnd = comment.match(/\s*@group\s+end\s+(.*)\s*/);
        if (foundEnd && foundEnd[1]) {
          this.push(this._groups.get(foundEnd[1]));
          this._groups.delete(foundEnd[1]);
        }
      },
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
