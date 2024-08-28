import {CommentCallback, Parser, ParserOptions, PrefixCallback, Quad} from 'n3';
import { EventEmitter } from "events";

export type GroupedQuadsCallback = Function; //function (Error|undefined, Quad[][]):void; 

export type GroupParserCallbacks = {
    onGroupedQuads: GroupedQuadsCallback;
    onComment: CommentCallback;
    onPrefix: PrefixCallback;
}

export default class GroupedParser {
    private _parser: Parser;

    constructor(options: ParserOptions) {
        this._parser = new Parser(options);
    }

    /**
     * 
     */  
    parse(input: string | EventEmitter, groupCallback?: GroupParserCallbacks|GroupedQuadsCallback): void{
        // The second parameter accepts an object { onGrouped: ..., onPrefix: ..., onComment: ...}
        // As a second and third parameter it still accepts a separate quadCallback and prefixCallback for backward compatibility as well
        let onGroupedQuads: GroupedQuadsCallback, onPrefix: PrefixCallback, onComment: CommentCallback;
        if (groupCallback && (
                    (groupCallback as GroupParserCallbacks).onGroupedQuads !== undefined || 
                    (groupCallback as GroupParserCallbacks).onComment !== undefined ||
                    (groupCallback as GroupParserCallbacks).onPrefix !== undefined )) {
            onGroupedQuads = (groupCallback as GroupParserCallbacks).onGroupedQuads;
            onPrefix = (groupCallback as GroupParserCallbacks).onPrefix;
            onComment = (groupCallback as GroupParserCallbacks).onComment;
        }
        else if (groupCallback) {
            onGroupedQuads = groupCallback as GroupedQuadsCallback;
            onComment = () => {};
        }

        let groups:Map<string, Quad[]> = new Map();

        this._parser.parse(input, {
            onQuad: (error, quad) => {
                if (error) {
                    onGroupedQuads(error);
                }
                else if (quad) {
                    groups.forEach(group => {
                        group.push(quad);
                    });
                    // If however there were no groups...
                    if (groups.size === 0) {
                        // Output a single quad group
                        onGroupedQuads(null,[quad]);
                    }
                } else {
                    // This is the end, just output the remaining groups if they weren’t closed
                    groups.forEach( (group, key) => {
                        onGroupedQuads(null, group);
                        groups.delete(key);
                    });
                    onGroupedQuads(null, null);
                }
            },
            onComment: (comment: string) => {
                // Parse comment and try to find a start pragma
                const foundBegin = comment.match(/\s*@group begin\s*(.*)\s*/);
                // When begin is found multiple times, it is going to reset the current set of quads.
                if (foundBegin && foundBegin[1] !== undefined) {
                    // If the group is named, then add it to the map
                    groups.set(foundBegin[1], []);
                }
                // Parse comment to find an end -- a second time the group is closed without opening it is just ignored
                const foundEnd = comment.match(/\s*@group end\s*(.*)\s*/);
                if (foundEnd && foundEnd[1] !== undefined) {
                    if (groups.has(foundEnd[1])){
                        onGroupedQuads(null, groups.get(foundEnd[1]));
                        groups.delete(foundEnd[1]);
                    }
                }
                onComment(comment);
            },
            onPrefix: onPrefix!
        });
    }
}