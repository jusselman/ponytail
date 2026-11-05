// What the Radio dial was on (stations, queue, the user), kept outside the
// Radio screen so it outlives a trip to another tab. See RadioScreen.jsx.
export const radioSession = {};

// Forget it all, so the next account starts fresh. Called on logout
// (SECURITY_RISKS.md SR-46).
export const clearRadioSession = () => {
  Object.keys(radioSession).forEach((key) => { delete radioSession[key]; });
};
