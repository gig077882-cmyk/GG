/**
 * Participant list rendering and local participant state updates.
 * @module participants
 */

import { participantsEl } from "./dom.js";
import { state } from "./state.js";
import { hashString } from "./utils.js";
import { avatarShapeOptions, normalizeAvatarShape } from "./theme.js";

/**
 * Cached array of non-empty avatar shape classes.
 * @type {string[]}
 */
const avatarShapes = Object.values(avatarShapeOptions).filter(Boolean);

/**
 * Resolve the CSS class for a participant's avatar shape.
 * @param {object} participant - Participant object.
 * @returns {string} CSS class name.
 */
export const getAvatarShapeClass = (participant) => {
  const preferred = normalizeAvatarShape(participant.shape);
  if (preferred && preferred !== "auto") {
    return avatarShapeOptions[preferred];
  }
  if (!avatarShapes.length) {
    return "";
  }
  const seed = participant.id || participant.name || "";
  const index = hashString(seed) % avatarShapes.length;
  return avatarShapes[index];
};

/**
 * Render the participant list in the sidebar.
 * @returns {void}
 */
export const renderParticipants = () => {
  participantsEl.innerHTML = "";
  state.participants.forEach((participant) => {
    const li = document.createElement("li");
    const avatar = document.createElement("span");
    avatar.className = `participant-avatar ${getAvatarShapeClass(participant)}`;
    avatar.style.backgroundColor = participant.color || state.textColor;
    li.appendChild(avatar);
    const name = document.createElement("span");
    name.textContent =
      participant.id === state.clientId
        ? `${participant.name} (вы)`
        : participant.name;
    li.appendChild(name);

    const mute = document.createElement("span");
    mute.className = `badge ${participant.muted ? "muted" : ""}`;
    mute.textContent = participant.muted ? "mute" : "live";
    li.appendChild(mute);

    const activity = document.createElement("span");
    activity.className = `badge ${participant.active ? "active" : ""}`;
    activity.textContent = participant.active ? "voice" : "idle";
    li.appendChild(activity);

    participantsEl.appendChild(li);
  });
};

/**
 * Patch the local participant object and re-render the list.
 * @param {object} patch - Partial participant data.
 * @returns {void}
 */
export const updateLocalParticipant = (patch) => {
  const me = state.participants.get(state.clientId);
  if (me) {
    state.participants.set(state.clientId, { ...me, ...patch });
    renderParticipants();
  }
};
