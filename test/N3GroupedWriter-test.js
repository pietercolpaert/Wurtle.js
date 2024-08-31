import {
  termFromId,
} from 'n3';
import GroupedWriter from '../dist/N3GroupedWriter';

describe('GroupedWriter', () => {
  describe('The GroupedWriter export', () => {
    it('should be a function', () => {
      expect(GroupedWriter).toBeInstanceOf(Function);
    });

    it('should be a GroupedWriter constructor', () => {
      expect(new GroupedWriter()).toBeInstanceOf(GroupedWriter);
    });
  });

  describe('A GroupedWriter instance', () => {

    it('should serialize 0 triples from 0 groups', shouldSerialize([], ''));

    it('should serialize 1 triple in 1 group', shouldSerialize([[['abc', 'def', 'ghi']]],
                    '# @group begin 0\n<abc> <def> <ghi>\n# @group end 0\n.\n'));

    it('should serialize 2 triples in 1 group', shouldSerialize([[['abc', 'def', 'ghi'],['abc2', 'def2', 'ghi2']]],
                    '# @group begin 0\n<abc> <def> <ghi>.\n<abc2> <def2> <ghi2>\n# @group end 0\n.\n'));

    it('should serialize 2 triples in 2 groups', shouldSerialize([[['abc', 'def', 'ghi']],[['abc2', 'def2', 'ghi2']]],
                    '# @group begin 0\n<abc> <def> <ghi>\n# @group end 0\n# @group begin 1\n.\n<abc2> <def2> <ghi2>\n# @group end 1\n.\n'));

    it('should serialize 3 triples in 2 groups', shouldSerialize([[['abc', 'def', 'ghi'],['abc', 'def3', 'ghi3']],[['abc2', 'def2', 'ghi2']]],
                    '# @group begin 0\n<abc> <def> <ghi>;\n    <def3> <ghi3>\n# @group end 0\n# @group begin 1\n.\n<abc2> <def2> <ghi2>\n# @group end 1\n.\n'));
                    
  });
});

function shouldSerialize(quadGroups, expectedResult) {
  
  return function (done) {
    const outputStream = new QuickStream(),
        groupedWriter = new GroupedWriter(outputStream); //, prefixes);
    for (const quadGroup of quadGroups) {
      let newQuadGroup = [];
      for (let element of quadGroup) {
        let newQuadInstance = {};
        newQuadInstance.subject   = typeof element[0] === 'string' ? termFromId(element[0]) : element[0];
        newQuadInstance.predicate = typeof element[1] === 'string' ? termFromId(element[1]) : element[1];
        newQuadInstance.object    = typeof element[2] === 'string' ? termFromId(element[2]) : element[2];
        newQuadInstance.graph     = typeof element[3] === 'string' ? termFromId(element[3]) : element[3];
        newQuadGroup.push(newQuadInstance);
      }
      groupedWriter.addGroupedQuads(newQuadGroup);
    }
    groupedWriter.end(error => {
      try {
        expect(outputStream.result).toBe(expectedResult);
        expect(outputStream).toHaveProperty('ended', true);
        done(error);
      }
      catch (e) {
        done(e);
      }
    });
  };
}

function QuickStream() {
  const stream = { ended: false };
  let buffer = '';
  stream.write = function (chunk, encoding, callback) {
    buffer += chunk;
    callback && callback();
  };
  stream.end = function (callback) {
    stream.ended = true;
    stream.result = buffer;
    buffer = null;
    callback();
  };
  return stream;
}