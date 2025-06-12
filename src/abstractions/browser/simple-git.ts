export function notAvailable(): never {
    throw new Error('simple-git is not available in the browser build');
}