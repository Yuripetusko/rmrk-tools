import { Consolidator } from "../src";
import { getRemarksFromBlocks } from "../src/tools/utils";
import {
  blockCollectionMintedTwice,
  blockNFTMintedTwice,
} from "./mocks/blocks";
import { blocks647x_661x } from "./mocks/blocks-dump";

/*
 [x] token is minted twice with same ID
 [ ] token is minted into collection which is at its limit
 [ ] token has any interaction more than once in a block (the rule is ONE interaction per unique token per block)
 [ ] token is double spent
 [ ] token is double set for sale (by owner okay, update price, by anyone else, discard)
 [ ] token is sent from address who is not the owner
 [ ] token is sold from address who is not the owner
 [ ] token is minted from address not in charge of collection
 [ ] collection reassigned twice
 [ ] collection reassigned by someone not owner
 */

/*
const logRemarksHelper = () => {
  const remarks = getRemarksFromBlocks(validBlocks).map((rmk) => {
    const [_prefix, _op_type, _version, dataString] = rmk.remark.split("::");
    return {
      ...rmk,
      _prefix,
      _op_type,
      _version,
      expanded: getRemarkData(dataString),
    };
  });
  console.log(JSON.stringify(remarks, null, 4));
};
(
 */

describe("tools: Consolidator", () => {
  it("should run consolidation from set of mixed valid and invalid blocks 647x_661x", () => {
    const remarks = getRemarksFromBlocks(blocks647x_661x);
    const consolidator = new Consolidator();
    expect(consolidator.consolidate(remarks)).toMatchSnapshot();
  });

  it("should be invalid: Collection token is minted twice with same ID", () => {
    const consolidator = new Consolidator();
    expect(
      consolidator.consolidate(getRemarksFromBlocks(blockCollectionMintedTwice))
        .invalid[0].message
    ).toBe("[MINT] Attempt to mint already existing collection");
  });

  it("should be invalid: NFT token is minted twice with same ID", () => {
    const consolidator = new Consolidator();
    expect(
      consolidator.consolidate(getRemarksFromBlocks(blockNFTMintedTwice))
        .invalid[0].message
    ).toBe("[MINTNFT] Attempt to mint already existing NFT");
  });
});