export const playSuccessSound = () => {
    try {
        const audio = new Audio('/success.mp3');
        audio.play().catch(e => console.error("Audio playback failed", e));
    } catch (e) {
        console.error("Audio error", e);
    }
};
