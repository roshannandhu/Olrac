"use strict";
const fs = require('fs');
const file = 'e:/IMP projects/olrac/frontend/src/pages/LocationDetail.jsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync(file, code);
