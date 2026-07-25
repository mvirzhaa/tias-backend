const fs = require('fs');
const path = require('path');
require('dotenv').config();

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if(file === 'index.js') return;
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const modelsDir = path.resolve(__dirname, '../models');
const allModelFiles = walkDir(modelsDir);
const allModels = [];

allModelFiles.forEach(file => {
    try {
        const model = require(file);
        if (model && model.tableName) {
            allModels.push(model);
        }
    } catch(e) {
        // ignore errors for models that require db connection
    }
});

let output = "# Struktur Database TIAS Backend (Sequelize Models)\n\n";

allModels.forEach(model => {
    output += `### Table: \`${model.tableName}\` (Model: ${model.name})\n\n`;
    const attributes = model.rawAttributes;
    if(!attributes) return;
    
    output += "| Kolom | Tipe Data | Keterangan |\n";
    output += "|---|---|---|\n";
    for (const attrName in attributes) {
        const attr = attributes[attrName];
        let typeStr = attr.type ? attr.type.key : "Unknown";
        let info = [];
        if (attr.primaryKey) info.push("**PK**");
        if (attr.autoIncrement) info.push("AutoInc");
        if (attr.allowNull === false) info.push("NOT NULL");
        if (attr.references) {
            let refTarget = attr.references.model;
            if (typeof refTarget === 'object' && refTarget.tableName) {
                refTarget = refTarget.tableName;
            }
            info.push(`FK -> \`${refTarget}.${attr.references.key}\``);
        }
        output += `| \`${attrName}\` | ${typeStr} | ${info.join(', ')} |\n`;
    }
    output += "\n";
});

console.log(output);
