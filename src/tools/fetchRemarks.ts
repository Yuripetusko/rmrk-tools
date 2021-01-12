import { BlockCall, BlockCalls } from "./types";
import { deeplog } from "../tools/utils";
import { ApiPromise } from "@polkadot/api";
import { Call } from "@polkadot/types/interfaces";

export default async (
  api: ApiPromise,
  from: number,
  to: number,
  prefix: string
): Promise<BlockCalls[]> => {
  const bcs: BlockCalls[] = [];
  for (let i = from; i <= to; i++) {
    if (i % 1000 === 0) {
      const event = new Date();
      console.log(`Block ${i} at time ${event.toTimeString()}`);
      if (i % 5000 === 0) {
        console.log(`Currently at ${bcs.length} remarks.`);
      }
    }

    const blockHash = await api.rpc.chain.getBlockHash(i);
    const block = await api.rpc.chain.getBlock(blockHash);
    const bc: BlockCall[] = [];

    if (block.block === undefined) {
      console.error("block.block is undefined for block " + i);
      deeplog(block);
      continue;
    }

    let exIndex = 0;
    exLoop: for (const ex of block.block.extrinsics) {
      if (ex.isEmpty || !ex.isSigned) {
        exIndex++;
        continue;
      }
      const {
        method: { args, method, section },
      } = ex;

      if (section === "system" && method === "remark") {
        const remark = args.toString();
        if (remark.indexOf(prefix) === 0) {
          bc.push({
            call: "system.remark",
            value: remark,
            caller: ex.signer.toString(),
          } as BlockCall);
        }
      } else if (
        section === "utility" &&
        (method === "batch" || method == "batchAll")
      ) {
        // @ts-ignore
        const batchargs: Call[] = args[0];
        let remarkExists = false;
        batchargs.forEach((el) => {
          if (
            el.section === "system" &&
            el.method === "remark" &&
            el.args.toString().indexOf(prefix) === 0
          ) {
            remarkExists = true;
          }
        });
        if (remarkExists) {
          const records = await api.query.system.events.at(blockHash);
          const events = records.filter(
            ({ phase, event }) =>
              phase.isApplyExtrinsic &&
              phase.asApplyExtrinsic.eq(exIndex) &&
              event.method.toString() === "BatchInterrupted"
          );
          if (events.length) {
            console.log(
              `Skipping batch ${i}-${exIndex} due to BatchInterrupted`
            );
            exIndex++;
            continue exLoop;
          }

          batchargs.forEach((el) => {
            bc.push({
              call: `${el.section}.${el.method}`,
              value: el.args.toString(),
              caller: ex.signer.toString(),
            } as BlockCall);
          });
        }
      }
      exIndex++;
    }

    if (bc.length) {
      bcs.push({
        block: i,
        calls: bc,
      } as BlockCalls);
    }
  }
  return bcs;
};