/**
 * ICE server configuration.
 * @module ice
 */

const { TURN_URLS, TURN_USER, TURN_PASS } = require("./config");

/**
 * Build the list of ICE servers offered to clients.
 * Always includes a public STUN server.
 * Adds TURN relays when credentials are configured.
 * @returns {object[]} ICE server configuration objects.
 */
const buildIceServers = () => {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];

  const turnUrls = TURN_URLS;
  if (turnUrls) {
    const urls = turnUrls.split(",").map((value) => value.trim()).filter(Boolean);
    if (urls.length) {
      servers.push({
        urls,
        username: TURN_USER,
        credential: TURN_PASS
      });
    }
  }

  return servers;
};

module.exports = {
  buildIceServers
};
