// src/utils/discord.js
const { PermissionFlagsBits } = require('discord.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAdmin(interaction) {
  // DMなどで memberPermissions が無い場合は false
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

module.exports = {
  sleep,
  isAdmin,
};
