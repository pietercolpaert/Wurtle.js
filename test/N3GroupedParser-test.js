import GroupedParser from '../dist/N3GroupedParser';
import { Readable } from 'readable-stream';

describe('GroupedParser', () => {
  describe('The GroupedParser export', () => {
    it('should be a function', () => {
      expect(typeof GroupedParser).toEqual('function');
    });

    it('should be a GroupedParser constructor', () => {
      expect(new GroupedParser()).toBeInstanceOf(GroupedParser);
    });
    it('should be a GroupedParser constructor with options', () => {
      expect(new GroupedParser({})).toBeInstanceOf(GroupedParser);
    });
  });

  describe('A GroupedParser instance', () => {

    it('parses one triple in a group in itself', shouldParseInGroups('<a> <b> <c>.', 1));

    it(
      'parses two triples in two groups on their own',
      shouldParseInGroups('<a> <b> <c>. <d> <e> <f>.', 2),
    );

    it(
      'parses three triples in two named groups',
      shouldParseInGroups('# @group begin 1\n <a> <b> <c>. \n# @group end 1\n# @group begin 2\n <d> <e> <f>.<g> <h> <i> . \n# @group end 2\n', 2),
    );

    it(
      'parses three triples in two unnamed groups',
      shouldParseInGroups('# @group begin \n <a> <b> <c>. \n# @group end \n# @group begin \n<d> <e> <f>.<g> <h> <i> . # @group end \n', 2),
    );

    it(
      'parses three triples in two groups, but the last one group has not been closed explicitly',
      shouldParseInGroups('# @group begin \n <a> <b> <c>. \n# @group end \n# @group begin \n<d> <e> <f>.<g> <h> <i> . \n', 2),
    );

    it(
      'parses two triples in two groups, but one group has been embedded, thus 3 triples in total',
      shouldParseInGroups('# @group begin 1\n <a> <b> <c>. \n# @group begin 2 \n<d> <e> <f>.\n# @group end 2\n# @group end 1 \n', 2),
    );
  });
});


function shouldParseInGroups(input, expectedLength, validateGroups) {
  return function (done) {
    const groups = [],
        parser = new GroupedParser({});

    parser.parse(input, (error, group) => {
        if (error) {
          done(error);
        }
        else if (group) {
          groups.push(group);
        }
        else {
          //this is the end
          expect(groups).toHaveLength(expectedLength);
          if (validateGroups) validateGroups(groups);
          done();
        }
    });
  
  };
}
