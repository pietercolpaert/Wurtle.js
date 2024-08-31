import { Quad } from "@rdfjs/types";
import { Prefixes, Writer, WriterOptions, ErrorCallback } from "n3";
import { Writable } from "readable-stream";

/**
 * Due to some historic decisions in N3.js it seems impossible to extend the Writer class.
 */
export default class GroupedWriter {
    private _groupCount;
    public writer : Writer;

    constructor (outputStream?: Writable | WriterOptions, options?:WriterOptions) {
        this.writer = new Writer(outputStream, options);
        this._groupCount = 0;
    }

    /**
     * Add a group of quads and group them using wurtle
     * @param groupedQuads 
     */
    public addGroupedQuads (groupedQuads: Quad[]) : void {
        this.writer._outputStream.write('# @group begin ' + this._groupCount+ '\n');
        for (let i = 0; i < groupedQuads.length; i++) {
            let quad = groupedQuads[i];
            this.writer.addQuad(quad.subject,quad.predicate, quad.object,quad.graph, () => {
                //If this was the last element, close the group now.
                if (groupedQuads.length === i+1) {
                    this.writer._outputStream.write('\n# @group end ' + this._groupCount + '\n');
                    this._groupCount++;
                }
            });
        }
    }

    public end (cb: ErrorCallback) : void {
        this.writer.end(cb);
    }
}
