const fs = require('fs');
const path = require('path');
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const inspect = (node, depth = 0) => {
  if (!node) return;
  const indent = '  '.repeat(depth);
  if (Array.isArray(node)) {
    node.forEach((child) => inspect(child, depth));
    return;
  }
  const type = node.type;
  const text = node[type]?.rich_text || node[type]?.title || [];
  const first = Array.isArray(text) ? text.map((t) => t.plain_text).join(' ') : '';
  console.log(`${indent}- ${type}${node.callout ? ` icon=${node.callout?.icon?.emoji || ''}` : ''} text=${JSON.stringify(first)}`);
  if (Array.isArray(node.children)) {
    inspect(node.children, depth + 1);
  }
};
inspect(data);
