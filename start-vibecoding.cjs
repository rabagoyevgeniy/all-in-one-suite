const path = require("path");
const port = process.env.PORT || "3000";
process.chdir(path.resolve(__dirname, "..", "vibecoding-app"));
process.argv = [process.argv[0], process.argv[1], "dev", "--port", port];
require("../vibecoding-app/node_modules/next/dist/bin/next");
