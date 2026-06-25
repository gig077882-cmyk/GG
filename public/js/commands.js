/**
 * Command input autocomplete and suggestion menu.
 * @module commands
 */

import { cmdInput, cmdMenu } from "./dom.js";

/**
 * List of supported slash commands.
 * @type {string[]}
 */
export const commandList = [
  "help",
  "create",
  "join",
  "id",
  "name",
  "mute",
  "unmute",
  "noise",
  "camera",
  "demo",
  "volume",
  "chat",
  "file",
  "chatpanel",
  "avatar",
  "theme",
  "leave"
];

/**
 * Close the command suggestion menu.
 * @returns {void}
 */
export const closeCommandMenu = () => {
  if (!cmdMenu) {
    return;
  }
  cmdMenu.classList.remove("open");
  cmdMenu.setAttribute("aria-hidden", "true");
  cmdMenu.innerHTML = "";
};

/**
 * Open the command suggestion menu.
 * @returns {void}
 */
export const openCommandMenu = () => {
  if (!cmdMenu) {
    return;
  }
  cmdMenu.classList.add("open");
  cmdMenu.setAttribute("aria-hidden", "false");
};

/**
 * Extract the first word (command token) from the input.
 * @param {string} value - Raw input value.
 * @returns {string} Lowercase command token.
 */
export const getCommandToken = (value) => {
  const raw = String(value || "");
  const trimmed = raw.trimStart();
  if (!trimmed) {
    return "";
  }
  const firstSpaceIndex = trimmed.search(/\s/);
  return (firstSpaceIndex === -1 ? trimmed : trimmed.slice(0, firstSpaceIndex)).toLowerCase();
};

/**
 * Check whether the input already contains arguments.
 * @param {string} value - Raw input value.
 * @returns {boolean} True if a space is present after the leading whitespace.
 */
export const commandInputHasArgs = (value) => /\s/.test(String(value || "").trimStart());

/**
 * Find commands that start with the given query.
 * @param {string} query - Query token.
 * @returns {string[]} Matching commands.
 */
export const findCommandMatches = (query) => {
  if (!query) {
    return [...commandList];
  }
  return commandList.filter((command) => command.startsWith(query));
};

/**
 * Mutable state for the command suggestion menu.
 * @type {{ seed: string, matches: string[], index: number }}
 */
export const commandSuggestState = {
  seed: "",
  matches: [],
  index: -1
};

/**
 * Insert a selected command into the input field.
 * @param {string} command - Command to insert.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.addTrailingSpace=true] - Append a space after the command.
 * @returns {void}
 */
export const selectCommandSuggestion = (command, options = {}) => {
  if (!cmdInput) {
    return;
  }
  const addTrailingSpace = options.addTrailingSpace !== false;
  const inputText = String(cmdInput.value || "");
  const leadingWhitespace = (inputText.match(/^\s*/) || [""])[0];
  const trimmed = inputText.trimStart();
  const firstSpaceIndex = trimmed.search(/\s/);
  const args = firstSpaceIndex === -1 ? "" : trimmed.slice(firstSpaceIndex).trimStart();
  const suffix = args ? ` ${args}` : addTrailingSpace ? " " : "";
  cmdInput.value = `${leadingWhitespace}${command}${suffix}`;
  cmdInput.setSelectionRange(cmdInput.value.length, cmdInput.value.length);
};

/**
 * Render the list of command suggestions.
 * @param {string[]} matches - Matching commands.
 * @param {number} [activeIndex=-1] - Currently selected index.
 * @returns {void}
 */
export const renderCommandMenu = (matches, activeIndex = -1) => {
  if (!cmdMenu) {
    return;
  }
  cmdMenu.innerHTML = "";
  matches.forEach((command, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "cmd-menu-item";
    option.textContent = command;
    if (index === activeIndex) {
      option.classList.add("is-active");
      option.setAttribute("aria-selected", "true");
    } else {
      option.setAttribute("aria-selected", "false");
    }
    option.addEventListener("mouseenter", () => {
      commandSuggestState.index = index;
      renderCommandMenu(commandSuggestState.matches, commandSuggestState.index);
      openCommandMenu();
    });
    option.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    option.addEventListener("click", () => {
      selectCommandSuggestion(command);
      commandSuggestState.index = index;
      closeCommandMenu();
      cmdInput?.focus();
    });
    cmdMenu.appendChild(option);
  });
};

/**
 * Reset the command suggestion state.
 * @returns {void}
 */
export const resetCommandSuggestState = () => {
  commandSuggestState.seed = "";
  commandSuggestState.matches = [];
  commandSuggestState.index = -1;
};

/**
 * Refresh suggestions based on the current input value.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.keepIndex=false] - Preserve the selected index.
 * @returns {string[]} Current matches.
 */
export const refreshCommandSuggestions = (options = {}) => {
  if (!cmdInput || !cmdMenu) {
    return [];
  }
  const keepIndex = options.keepIndex === true;
  const value = cmdInput.value || "";
  if (commandInputHasArgs(value)) {
    closeCommandMenu();
    resetCommandSuggestState();
    return [];
  }
  const query = getCommandToken(value);
  const matches = findCommandMatches(query);
  if (!matches.length) {
    closeCommandMenu();
    resetCommandSuggestState();
    return [];
  }
  const nextIndex =
    keepIndex && commandSuggestState.index >= 0 && commandSuggestState.index < matches.length
      ? commandSuggestState.index
      : -1;
  commandSuggestState.seed = query;
  commandSuggestState.matches = matches;
  commandSuggestState.index = nextIndex;
  renderCommandMenu(matches, nextIndex);
  openCommandMenu();
  return matches;
};
