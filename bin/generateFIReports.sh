#/bin/env bash

# Allows node to use ~16GB of memory
node --max_old_space_size=16384 --require ts-node/register -r dotenv/config generateFIReport.ts
