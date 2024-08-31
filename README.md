# Wurtle

Wurtle.js contains utilities to work with RDF serializations (the ones supported by [N3.js](https://github.com/rdfjs/N3.js)) that support grouping quads based on a parser directive or pragma in the comments.

Take for example this Turtle file:

```turtle
# @group begin 0
ex:Collection1 a tree:Collection;
            rdfs:label "A Collection of 2 subjects"@en;
            tree:member ex:Subject1, ex:Subject2 .
# @group end 0
# @group begin 1
ex:Subject1 a ex:Subject ;
            rdfs:label "Subject 1" ;
            ex:linkedTo [ a ex:Subject ] .
# @group end 1
# @group begin 2
ex:Subject2 a ex:Subject ;
            rdfs:label "Subject 2" ;
            ex:linkedTo ex:Subject3 .

ex:Subject3 a ex:Subject ;
            rdfs:label "Subject 3" ;
            ex:linkedTo ex:Subject2 .
# @group end 2
```

These directives indicate to the parser that each group of triples are a separate message and should be emitted as one group.
Instead of a stream of quads, we will thus have waves of quads.

The name: Wurtle stands for the `Waved RDF Triple Language`, similar to Turtle. In the Dutch dialect of Ghent, Wurtle means carrot (🥕), used as a name for people who complain a lot, when one would like to urge them to be more pragmatic and mild. For example: folks within the RDF community that find this extension to Turtle heresy would be wurtles.

Groups can be nested and overlap: this way quads will be part of multiple groups and will also be emitted multiple times.
Quads that are not in any group will be emitted in their own group and will be emitted from the moment they appear.

## Utilities

### GroupedParser

The grouped parser follows the same pattern as the [N3.js Parser documentation](https://github.com/rdfjs/N3.js/tree/main?tab=readme-ov-file#parsing).
For example:

```javascript
import {GroupedParser} from 'wurtle';
const parser = new GroupedParser(),
      rdfStream = fs.createReadStream('cartoons.ttl');

parser.parse(rdfStream, (error, groupedQuads) => {
    if (!error)
        console.dir(groupedQuads);
});
```

The parser will callback groupedQuads from the moment and end group is found. Unclosed groups are emitted at the end of the file.

### GroupedStreamParser

Similar as the Parser, but now using NodeJS streams.

```javascript
import {GroupedStreamParser} from 'wurtle';
const parser = new GroupedStreamParser(),
      rdfStream = fs.createReadStream('cartoons.ttl');

const parsedStream = rdfStream.pipe(parser);
parsedStream.on('data', (groupedQuads) => {
    console.dir(groupedQuads);
});
```

### GroupedWriter

This supports writing out groups of quads. The writer does not support nesting or overlapping groups.

Options of the GrouperWriter is the same options as the [N3.Writer](https://github.com/rdfjs/N3.js/tree/main?tab=readme-ov-file#writing)

```javascript
import {GroupedWriter} from 'wurtle';
const writer = new GroupedWriter(options);
writer.addGroupedQuads(quadGroup0);
writer.addGroupedQuads(quadGroup1);
writer.end((error, result) => {
    console.log(result);
});
```