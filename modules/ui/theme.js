import { state } from '../state.js';

export function applyTheme() {
    document.body.className = `theme-${state.settings.theme}`;
}
